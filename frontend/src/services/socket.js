import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('🔌 Socket ya está conectado');
      return;
    }

    console.log('🔌 Conectando a Socket.IO...', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado a Socket.IO:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado de Socket.IO:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        // El servidor desconectó, intentar reconectar manualmente
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Máximo de intentos de reconexión alcanzado');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconectado a Socket.IO después de', attemptNumber, 'intentos');
      this.isConnected = true;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Falló la reconexión a Socket.IO');
    });

    return this.socket;
  }

  joinPuntoVenta(puntoVentaId) {
    if (this.socket && this.isConnected) {
      console.log('📍 Uniéndose a sala punto-venta:', puntoVentaId);
      this.socket.emit('join-punto-venta', puntoVentaId);
    }
  }

  joinStaff(puntoTrabajoNombre) {
    if (this.socket && this.isConnected) {
      console.log('👤 Uniéndose a sala staff:', puntoTrabajoNombre);
      this.socket.emit('join-staff', puntoTrabajoNombre);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Guardar referencia para poder eliminarla después
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remover de la lista de listeners
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Desconectando Socket.IO...');
      
      // Remover todos los listeners
      this.listeners.forEach((callbacks, event) => {
        this.socket.removeAllListeners(event);
      });
      this.listeners.clear();
      
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    };
  }
}

// Exportar una única instancia (singleton)
export const socketService = new SocketService();
export default socketService;
