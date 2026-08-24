const AuditLog = require('../models/AuditLog');

const auditLogger = (tipo) => {
  return async (req, res, next) => {
    // Capturar la IP y el User-Agent de forma síncrona, antes de enviar la
    // respuesta. Si se leen más tarde (p.ej. dentro de setImmediate, luego de
    // que res.json ya respondió), el socket puede estar cerrado y req.ip /
    // req.connection quedan undefined, guardando la IP vacía en el log.
    const clientIp = req.ip || req.socket?.remoteAddress || 'Unknown';
    const clientUserAgent = req.get('User-Agent');

    // Guardar el método original de res.json
    const originalJson = res.json;

    res.json = function(data) {
      // Solo registrar si la respuesta es exitosa
      if (res.statusCode < 400 && req.user) {
        // Ejecutar logging asíncrono sin bloquear la respuesta
        setImmediate(async () => {
          try {
            const logData = {
              tipo,
              usuario: req.user._id,
              ip: clientIp,
              userAgent: clientUserAgent,
              puntoTrabajo: req.user.puntoTrabajo
            };

            // Agregar detalles específicos según el tipo
            switch (tipo) {
              case 'impresion':
              case 'reimpresion':
                if (req.body.ticketId) {
                  logData.ticketId = req.body.ticketId;
                }
                if (req.body.transactionId) {
                  logData.transactionId = req.body.transactionId;
                }
                logData.detalles = {
                  quienRetira: req.body.quienRetira,
                  celular: req.body.celular,
                  motivo: req.body.motivo
                };
                break;
              case 'creacion_usuario':
                logData.detalles = {
                  usuarioCreado: req.body.usuario,
                  roles: req.body.roles || (req.body.rol ? [req.body.rol] : undefined),
                  puntoTrabajo: req.body.puntoTrabajo
                };
                break;
            }

            await AuditLog.create(logData);
          } catch (error) {
            console.error('Error al crear log de auditoría:', error);
          }
        });
      }
      
      // Llamar al método original
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = auditLogger;
