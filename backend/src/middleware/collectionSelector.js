const { getTicketModel, getActiveCollection } = require('../config/collections');
const logger = require('../config/logger');

/**
 * Middleware que carga el modelo de Ticket para la colección activa
 * (definida por COLLECTION_NAME) y lo adjunta a req.TicketModel
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
    // No hay colección por defecto a la que caer: si COLLECTION_NAME no está
    // configurada, seguir adelante significaría leer/escribir en una
    // colección equivocada. Mejor cortar aquí con el error visible.
    logger.error('❌ Error al determinar colección activa:', error);
    next(error);
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
      descripcion: `Colección de tickets: ${activeCollection.active}`
    };
    next();
  } catch (error) {
    logger.error('❌ Error al obtener información de colección:', error);
    next(error);
  }
};

module.exports = {
  selectCollection,
  getActiveCollectionInfo
};
