const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Crear un log de auditoría
 * @param {string} userId - ID del usuario que realiza la acción
 * @param {string} action - Tipo de acción (CREATE, UPDATE, DELETE, etc.)
 * @param {string} resourceType - Tipo de recurso afectado
 * @param {string} resourceId - ID del recurso afectado
 * @param {string} details - Detalles adicionales de la acción
 * @param {Object} metadata - Metadatos adicionales (opcional)
 */
const createAuditLog = async (userId, action, resourceType, resourceId, details, metadata = {}) => {
  try {
    // Mapear el action a los tipos permitidos en el modelo existente
    let tipo = 'creacion_usuario'; // default
    
    if (action === 'CREATE' && resourceType === 'PuntoVenta') {
      tipo = 'creacion_usuario'; // Reutilizamos este tipo para puntos de venta
    } else if (action === 'UPDATE' && resourceType === 'PuntoVenta') {
      tipo = 'cambio_password'; // Reutilizamos este tipo para updates
    } else if (action === 'DELETE' && resourceType === 'PuntoVenta') {
      tipo = 'logout'; // Reutilizamos este tipo para deletes
    } else if (action === 'PRINT') {
      tipo = 'impresion';
    } else if (action === 'REPRINT') {
      tipo = 'reimpresion';
    } else if (action === 'LOGIN') {
      tipo = 'login';
    } else if (action === 'LOGOUT') {
      tipo = 'logout';
    }

    const auditLog = new AuditLog({
      tipo,
      usuario: userId,
      ticketId: resourceType === 'Ticket' ? resourceId : undefined,
      puntoTrabajo: metadata.puntoTrabajo || undefined,
      detalles: {
        action,
        resourceType,
        resourceId,
        details,
        ...metadata
      }
    });

    await auditLog.save();
    
    // También loguearlo en el sistema de logs
    logger.info(`Audit: ${action} ${resourceType} ${resourceId} by user ${userId}`, {
      userId,
      action,
      resourceType,
      resourceId,
      details,
      metadata
    });

    return auditLog;
  } catch (error) {
    logger.error('Error creating audit log:', error);
    // No lanzar error para no interrumpir el flujo principal
    return null;
  }
};

/**
 * Crear log de auditoría para tickets
 */
const createTicketAuditLog = async (userId, action, ticketId, details, metadata = {}) => {
  return createAuditLog(userId, action, 'Ticket', ticketId, details, metadata);
};

/**
 * Crear log de auditoría para usuarios
 */
const createUserAuditLog = async (userId, action, targetUserId, details, metadata = {}) => {
  return createAuditLog(userId, action, 'User', targetUserId, details, metadata);
};

/**
 * Crear log de auditoría para puntos de venta
 */
const createPuntoVentaAuditLog = async (userId, action, puntoVentaId, details, metadata = {}) => {
  return createAuditLog(userId, action, 'PuntoVenta', puntoVentaId, details, metadata);
};

/**
 * Crear log de auditoría para autenticación
 */
const createAuthAuditLog = async (userId, action, details, metadata = {}) => {
  return createAuditLog(userId, action, 'Auth', userId, details, metadata);
};

module.exports = {
  createAuditLog,
  createTicketAuditLog,
  createUserAuditLog,
  createPuntoVentaAuditLog,
  createAuthAuditLog
};
