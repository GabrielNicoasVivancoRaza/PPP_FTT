const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const logger = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const auditRoutes = require('./routes/audit');
const puntoVentaRoutes = require('./routes/puntoVentaRoutes');
const printerSettingsRoutes = require('./routes/printerSettings');
const printRequestRoutes = require('./routes/printRequests');

const app = express();
const server = http.createServer(app);

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting - Más permisivo para evitar bloqueos
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto (reducido de 15 minutos)
  max: 200, // 200 requests por minuto (aumentado de 100 cada 15 min)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Excluir rutas de verificación de cambios del rate limit
  skip: (req) => {
    return req.url.includes('/check-changes') || req.url.includes('/health');
  }
});
app.use(limiter);

// CORS (permitir frontend en Render y localhost en desarrollo)
const allowRenderWildcard = /\.onrender\.com$/;
const devOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir llamadas sin origin (por ejemplo, herramientas internas)
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV !== 'production') {
      return devOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'));
    }

    const allowed = configuredOrigins.includes(origin) || allowRenderWildcard.test(origin);
    return allowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Health check endpoints (BEFORE other routes)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'API_OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cors: req.headers.origin || 'No origin header'
  });
});

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/puntos-venta', puntoVentaRoutes);
app.use('/api/printer-settings', printerSettingsRoutes);
app.use('/api/print-requests', printRequestRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Canje FTT API - Sistema funcionando correctamente',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      tickets: '/api/tickets',
      audit: '/api/audit',
      puntosVenta: '/api/puntos-venta',
      printerSettings: '/api/printer-settings',
      printRequests: '/api/print-requests'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Ruta solicitada: ${req.method} ${req.originalUrl}`);
  console.log(`Headers: ${JSON.stringify(req.headers)}`);
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    requestedPath: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Recurso duplicado'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 5002;

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  logger.error('Uncaught Exception:', err);
  // Dar tiempo para que winston escriba el log antes de salir
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection:', { promise, reason });
});

// Configurar Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Permitir llamadas sin origin
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV !== 'production') {
        const devOrigins = ['http://localhost:3000', 'http://localhost:5173'];
        return devOrigins.includes(origin) 
          ? callback(null, true) 
          : callback(new Error('Not allowed by CORS'));
      }

      const allowRenderWildcard = /\.onrender\.com$/;
      const configuredOrigins = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);

      const allowed = configuredOrigins.includes(origin) || allowRenderWildcard.test(origin);
      return allowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);

  // Unirse a una sala específica por punto de venta
  socket.on('join-punto-venta', (puntoVentaId) => {
    socket.join(`punto-venta-${puntoVentaId}`);
    console.log(`📍 Socket ${socket.id} se unió a punto-venta-${puntoVentaId}`);
  });

  // Unirse a sala de staff
  socket.on('join-staff', (puntoTrabajoNombre) => {
    socket.join(`staff-${puntoTrabajoNombre}`);
    console.log(`👤 Socket ${socket.id} se unió a staff-${puntoTrabajoNombre}`);
  });

  // Unirse a sala de impresores (cola de impresión compartida)
  socket.on('join-impresores', () => {
    socket.join('impresores');
    console.log(`🖨️ Socket ${socket.id} se unió a la sala de impresores`);
  });

  // Emparejamiento del escáner: la computadora y el celular se unen a la
  // misma sesión (código aleatorio mostrado como QR) para que el celular
  // pueda reenviar los códigos que escanea con su cámara
  socket.on('join-scan-session', (sessionCode) => {
    if (!sessionCode) return;
    socket.join(`scan-${sessionCode}`);
    console.log(`📷 Socket ${socket.id} se unió a scan-${sessionCode}`);
  });

  // El celular reenvía el código detectado; solo lo reciben los demás
  // miembros de la sesión (la computadora), no el propio emisor
  socket.on('scan-detected', ({ sessionCode, code } = {}) => {
    if (!sessionCode || !code) return;
    socket.to(`scan-${sessionCode}`).emit('scan-detected', {
      code,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// Exportar io para usar en controladores
app.set('io', io);

// Iniciando servidor en puerto actualizado
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  logger.info(`Servidor iniciado en puerto ${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
