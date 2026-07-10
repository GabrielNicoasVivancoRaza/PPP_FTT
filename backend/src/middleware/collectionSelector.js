const { getTicketModel, getActiveCollection } = require('../config/collections');
const logger = require('../config/logger');

/**
 * Middleware que carga el modelo de Ticket para la colección Lumineers_Canje
 * Adjunta el modelo de Ticket activo a req.TicketModel
 */
const selectCollection = async (req, res, next) => {
  try {
    const collectionInfo = getActiveCollection();
    const collectionName = collectionInfo.active;

    // Obtener el modelo de Ticket para la colección
    req.activeCollection = collectionName;
    req.activeCollections = [collectionName];
    req.TicketModel = getTicketModel();
    
    logger.info(`✅ Usando colección: ${collectionName}`);

    next();
  } catch (error) {
    logger.error('❌ Error al determinar colección activa:', error);
    
    // En caso de error, usar colección por defecto
    const collectionInfo = getActiveCollection();
    req.activeCollection = collectionInfo.active;
    req.activeCollections = [collectionInfo.active];
    req.TicketModel = getTicketModel();
    
    next();
  }
};

/**
 * Middleware para obtener información de la colección activa
 */
const getActiveCollectionInfo = async (req, res, next) => {
  try {
    const activeCollection = getActiveCollection();
    req.collectionInfo = {
      nombre: activeCollection.active,
      activa: true,
      descripcion: 'Base de datos Lumineers - Canje de boletos'
    };
    next();
  } catch (error) {
    logger.error('❌ Error al obtener información de colección:', error);
    req.collectionInfo = {
      nombre: 'Lumineers_Canje',
      activa: true,
      descripcion: 'Base de datos Lumineers - Canje de boletos'
    };
    next();
  }
};

module.exports = {
  selectCollection,
  getActiveCollectionInfo
};
