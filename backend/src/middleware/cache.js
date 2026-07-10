const NodeCache = require('node-cache');

// Cache con TTL de 5 minutos para datos generales y 1 minuto para datos que cambian frecuentemente
const generalCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const quickCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

// Middleware de caché para respuestas GET
const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl}_${req.user?.id || 'anonymous'}`;
    const cache = duration <= 60 ? quickCache : generalCache;
    
    try {
      const cachedData = cache.get(key);
      
      if (cachedData) {
        console.log(`Cache hit for: ${key}`);
        return res.json(cachedData);
      }

      // Interceptar la respuesta para guardarla en caché
      const originalJson = res.json;
      res.json = function(data) {
        // Solo cachear respuestas exitosas
        if (res.statusCode === 200) {
          cache.set(key, data, duration);
          console.log(`Cache set for: ${key}`);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Middleware para invalidar caché cuando hay cambios
const invalidateCache = (patterns = []) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Solo invalidar si la operación fue exitosa
      if (res.statusCode === 200 || res.statusCode === 201) {
        patterns.forEach(pattern => {
          const keys = generalCache.keys().filter(key => key.includes(pattern));
          keys.forEach(key => generalCache.del(key));
          
          const quickKeys = quickCache.keys().filter(key => key.includes(pattern));
          quickKeys.forEach(key => quickCache.del(key));
        });
        console.log(`Cache invalidated for patterns: ${patterns.join(', ')}`);
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

// Función para limpiar toda la caché
const clearAllCache = () => {
  generalCache.flushAll();
  quickCache.flushAll();
  console.log('All cache cleared');
};

// Función para obtener estadísticas de caché
const getCacheStats = () => {
  return {
    general: generalCache.getStats(),
    quick: quickCache.getStats()
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearAllCache,
  getCacheStats
};
