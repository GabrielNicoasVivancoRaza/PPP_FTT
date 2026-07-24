const PuntoVenta = require('../models/PuntoVenta');
const Ticket = require('../models/Ticket');
const { createAuditLog } = require('../utils/auditLogger');

// Obtener todos los puntos de venta
const getPuntosVenta = async (req, res) => {
  try {
    const puntosVenta = await PuntoVenta.find({ activo: true })
      .populate('creadoPor', 'nombre usuario')
      .sort({ nombre: 1 });
    
    res.json({
      success: true,
      data: puntosVenta
    });
  } catch (error) {
    console.error('Error al obtener puntos de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear nuevo punto de venta
const createPuntoVenta = async (req, res) => {
  try {
    const { nombre, descripcion, localidades } = req.body;

    // Validar datos requeridos
    if (!nombre || !localidades || localidades.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y al menos una localidad son requeridos'
      });
    }

    // Verificar que no exista un punto de venta con el mismo nombre
    const existingPunto = await PuntoVenta.findOne({ nombre: nombre.trim() });
    if (existingPunto) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un punto de venta con ese nombre'
      });
    }

    const puntoVenta = new PuntoVenta({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim(),
      localidades,
      creadoPor: req.user._id
    });

    await puntoVenta.save();
    await puntoVenta.populate('creadoPor', 'nombre usuario');

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'CREATE',
      'PuntoVenta',
      puntoVenta._id,
      `Punto de venta creado: ${nombre}`
    );

    res.status(201).json({
      success: true,
      data: puntoVenta,
      message: 'Punto de venta creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Actualizar punto de venta
const updatePuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, localidades } = req.body;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Si se cambia el nombre, verificar que no exista otro con el mismo nombre
    if (nombre && nombre.trim() !== puntoVenta.nombre) {
      const existingPunto = await PuntoVenta.findOne({ 
        nombre: nombre.trim(),
        _id: { $ne: id }
      });
      if (existingPunto) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un punto de venta con ese nombre'
        });
      }
    }

    // Actualizar campos
    if (nombre) puntoVenta.nombre = nombre.trim();
    if (descripcion !== undefined) puntoVenta.descripcion = descripcion?.trim();
    if (localidades) puntoVenta.localidades = localidades;

    await puntoVenta.save();
    await puntoVenta.populate('creadoPor', 'nombre usuario');

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'UPDATE',
      'PuntoVenta',
      puntoVenta._id,
      `Punto de venta actualizado: ${puntoVenta.nombre}`
    );

    res.json({
      success: true,
      data: puntoVenta,
      message: 'Punto de venta actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Desactivar punto de venta
const deletePuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    puntoVenta.activo = false;
    await puntoVenta.save();

    // Crear log de auditoría
    await createAuditLog(
      req.user._id,
      'DELETE',
      'PuntoVenta',
      puntoVenta._id,
      `Punto de venta desactivado: ${puntoVenta.nombre}`
    );

    res.json({
      success: true,
      message: 'Punto de venta desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener tickets por punto de venta
const getTicketsByPuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '', seatSearch = '', ticketIdSearch = '', sortBy = '', sortOrder = 'asc' } = req.query;

    // Usar el modelo de la colección activa (misma que /api/tickets)
    const TicketModel = req.TicketModel || Ticket;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Crear filtros para buscar tickets que contengan las localidades del punto de venta
    const localidadFilters = puntoVenta.localidades.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    let query = {
      $or: localidadFilters
    };

    // Construir filtros de búsqueda
    const searchFilters = [];

    // Agregar filtro de búsqueda general si se proporciona
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Usar búsqueda de texto de MongoDB si es posible, sino usar regex
      try {
        // Intentar búsqueda de texto primero (más rápida)
        const textSearchQuery = {
          $and: [
            { $or: localidadFilters },
            { $text: { $search: searchTerm } }
          ]
        };
        
        const testCount = await TicketModel.countDocuments(textSearchQuery);
        if (testCount > 0) {
          query = textSearchQuery;
        } else {
          throw new Error('No text search results, fallback to regex');
        }
      } catch (error) {
        // Fallback a búsqueda regex
        const searchRegex = { $regex: searchTerm, $options: 'i' };
        
        searchFilters.push({
          $or: [
            { 'First Name': searchRegex },
            { 'Last Name': searchRegex },
            { 'Email': searchRegex },
            { 'Ticket ID': searchTerm },
            { 'Transaction ID': searchTerm },
            { 'Numero de Cedula:': searchRegex }
          ]
        });
      }
    }

    // Agregar filtro específico de asiento si se proporciona
    if (seatSearch && seatSearch.trim()) {
      const seatSearchTerm = seatSearch.trim();
      const seatRegex = { $regex: seatSearchTerm, $options: 'i' };
      searchFilters.push({ 'Seat': seatRegex });
    }

    // Agregar filtro específico de Ticket ID si se proporciona
    if (ticketIdSearch && ticketIdSearch.trim()) {
      // Ticket ID es String en el schema
      searchFilters.push({ 'Ticket ID': ticketIdSearch.trim() });
    }

    // Combinar filtros
    if (searchFilters.length > 0) {
      if (query.$text) {
        // Si ya tenemos búsqueda de texto, agregar filtros adicionales
        if (seatSearch && seatSearch.trim()) {
          const seatSearchTerm = seatSearch.trim();
          const seatRegex = { $regex: seatSearchTerm, $options: 'i' };
          query = {
            $and: [
              query,
              { 'Seat': seatRegex }
            ]
          };
        }
        if (ticketIdSearch && ticketIdSearch.trim()) {
          query = {
            $and: [
              query,
              { 'Ticket ID': ticketIdSearch.trim() }
            ]
          };
        }
      } else {
        // Usar filtros regex
        query = {
          $and: [
            { $or: localidadFilters },
            ...searchFilters
          ]
        };
      }
    }

    const skip = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100); // Limitar máximo 100 por página

    // Configurar ordenamiento
    let sortObj = { 'First Name': 1, 'Last Name': 1 }; // Ordenamiento por defecto
    
    if (sortBy) {
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      sortObj = { [sortBy]: sortDirection };
    }

    // Ejecutar consultas en paralelo para mejor performance
    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .populate('usuarioResponsable', 'nombre usuario email')
        .skip(skip)
        .limit(limitNum)
        .sort(sortObj)
        .maxTimeMS(10000) // Timeout de 10 segundos para prevenir cuelgues
        .lean(), // usar lean() para mejor performance
      TicketModel.countDocuments(query).maxTimeMS(5000) // Timeout de 5 segundos para count
    ]);

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'X-Timestamp': new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        },
        puntoVenta: puntoVenta.nombre
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al obtener tickets por punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas por punto de venta
const getEstadisticasPuntoVenta = async (req, res) => {
  try {
    const { id } = req.params;

    // Usar el modelo de la colección activa (misma que /api/tickets)
    const TicketModel = req.TicketModel || Ticket;

    const puntoVenta = await PuntoVenta.findById(id);
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Crear filtros para las localidades del punto de venta
    const localidadFilters = puntoVenta.localidades.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    const query = { $or: localidadFilters };

    // Contar total de tickets
    const totalTickets = await TicketModel.countDocuments(query);

    // Estadísticas por localidad
    const estadisticasPorLocalidad = await Promise.all(
      puntoVenta.localidades.map(async (localidad) => {
        const count = await TicketModel.countDocuments({
          'Ticket': { $regex: localidad, $options: 'i' }
        });
        return {
          localidad,
          cantidad: count
        };
      })
    );

    res.json({
      success: true,
      data: {
        puntoVenta: puntoVenta.nombre,
        totalTickets,
        localidades: puntoVenta.localidades,
        estadisticasPorLocalidad
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del punto de venta:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener tickets para staff (solo su punto de trabajo)
const getTicketsForStaff = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', seatSearch = '', ticketIdSearch = '', sortBy = '', sortOrder = 'asc' } = req.query;

    // Usar el modelo de la colección activa (misma que /api/tickets)
    const TicketModel = req.TicketModel || Ticket;

    // El staff solo puede ver tickets relacionados con su punto de trabajo
    const userPuntoTrabajo = req.user.puntoTrabajo;
    
    if (!userPuntoTrabajo) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no tiene punto de trabajo asignado'
      });
    }

    // Buscar el punto de venta que coincida con el punto de trabajo del usuario
    const puntoVenta = await PuntoVenta.findOne({ 
      nombre: userPuntoTrabajo,
      activo: true 
    });

    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: `No se encontró un punto de venta activo llamado "${userPuntoTrabajo}". Verifique la configuración del punto de trabajo del usuario.`
      });
    }

    const localidadesAsignadas = puntoVenta.localidades;
    
    // Crear filtros para las localidades asignadas al punto de trabajo
    const localidadFilters = localidadesAsignadas.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    let query = {
      $or: localidadFilters
    };

    // Construir filtros de búsqueda
    const searchFilters = [];

    // Agregar filtro de búsqueda general si se proporciona
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = { $regex: searchTerm, $options: 'i' };
      
      searchFilters.push({
        $or: [
          { 'First Name': searchRegex },
          { 'Last Name': searchRegex },
          { 'Email': searchRegex },
          { 'Ticket ID': searchTerm },
          { 'Transaction ID': searchTerm },
          { 'Numero de Cedula:': searchRegex }
        ]
      });
    }

    // Agregar filtro específico de asiento si se proporciona
    if (seatSearch && seatSearch.trim()) {
      const seatSearchTerm = seatSearch.trim();
      const seatRegex = { $regex: seatSearchTerm, $options: 'i' };
      searchFilters.push({ 'Seat': seatRegex });
    }

    // Agregar filtro específico de Ticket ID si se proporciona
    if (ticketIdSearch && ticketIdSearch.trim()) {
      // Ticket ID es String en el schema
      searchFilters.push({ 'Ticket ID': ticketIdSearch.trim() });
    }

    // Combinar filtros
    if (searchFilters.length > 0) {
      query = {
        $and: [
          { $or: localidadFilters },
          ...searchFilters
        ]
      };
    }

    const skip = (page - 1) * limit;
    const limitNum = Math.min(parseInt(limit), 100);

    // Configurar ordenamiento
    let sortObj = { 'First Name': 1, 'Last Name': 1 }; // Ordenamiento por defecto
    
    if (sortBy) {
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      sortObj = { [sortBy]: sortDirection };
    }

    // Ejecutar consultas en paralelo
    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .populate('usuarioResponsable', 'nombre usuario email')
        .skip(skip)
        .limit(limitNum)
        .sort(sortObj)
        .maxTimeMS(10000) // Timeout de 10 segundos
        .lean(),
      TicketModel.countDocuments(query).maxTimeMS(5000) // Timeout de 5 segundos
    ]);

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0', 
      'Last-Modified': new Date().toUTCString(),
      'X-Timestamp': new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        },
        puntoTrabajo: userPuntoTrabajo,
        localidadesAsignadas
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al obtener tickets para staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Verificar si hay cambios en tickets de un punto de venta (endpoint ligero)
const checkTicketsChanges = async (req, res) => {
  try {
    const { id } = req.params;
    const { lastCheckTime } = req.query;

    // Usar el modelo de la colección activa (misma que /api/tickets)
    const TicketModel = req.TicketModel || Ticket;

    const puntoVenta = await PuntoVenta.findById(id).lean(); // usar lean para mejor performance
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Crear filtros para las localidades del punto de venta
    const localidadFilters = puntoVenta.localidades.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    let query = { $or: localidadFilters };

    // Si se proporciona lastCheckTime, buscar solo tickets modificados después de esa fecha
    if (lastCheckTime) {
      query.updatedAt = { $gt: new Date(lastCheckTime) };
    }

    // Ejecutar ambas queries en paralelo con timeouts
    const [modifiedCount, stats] = await Promise.all([
      TicketModel.countDocuments(query).maxTimeMS(3000), // Timeout de 3 segundos
      TicketModel.aggregate([
        { $match: { $or: localidadFilters } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            canjeados: { $sum: { $cond: ['$canjeado', 1, 0] } },
            lastUpdate: { $max: '$updatedAt' }
          }
        }
      ]).maxTimeMS(3000) // Timeout de 3 segundos
    ]);

    const hasChanges = modifiedCount > 0;

    res.json({
      success: true,
      data: {
        hasChanges,
        modifiedCount,
        stats: stats[0] || { total: 0, canjeados: 0, lastUpdate: null },
        checkTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking tickets changes:', error);
    
    // Si es timeout, retornar respuesta parcial
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Servicio temporalmente sobrecargado, intente de nuevo',
        retry: true
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Verificar si hay cambios en tickets para staff (endpoint ligero)
const checkTicketsChangesForStaff = async (req, res) => {
  try {
    const { lastCheckTime } = req.query;

    // Usar el modelo de la colección activa (misma que /api/tickets)
    const TicketModel = req.TicketModel || Ticket;

    // Obtener el punto de trabajo del usuario
    const userPuntoTrabajo = req.user.puntoTrabajo;
    if (!userPuntoTrabajo) {
      return res.status(403).json({
        success: false,
        message: 'Usuario no tiene punto de trabajo asignado'
      });
    }

    // CORREGIDO: Buscar por nombre ya que puntoTrabajo es un STRING, no un ObjectId
    const puntoVenta = await PuntoVenta.findOne({ 
      nombre: userPuntoTrabajo,
      activo: true 
    }).lean(); // usar lean
    
    if (!puntoVenta) {
      return res.status(404).json({
        success: false,
        message: 'Punto de venta no encontrado'
      });
    }

    // Crear filtros para las localidades del punto de venta
    const localidadFilters = puntoVenta.localidades.map(localidad => ({
      'Ticket': { $regex: localidad, $options: 'i' }
    }));

    let query = { $or: localidadFilters };

    // Si se proporciona lastCheckTime, buscar solo tickets modificados después de esa fecha
    if (lastCheckTime) {
      query.updatedAt = { $gt: new Date(lastCheckTime) };
    }

    // Ejecutar ambas queries en paralelo con timeouts
    const [modifiedCount, stats] = await Promise.all([
      TicketModel.countDocuments(query).maxTimeMS(3000), // Timeout de 3 segundos
      TicketModel.aggregate([
        { $match: { $or: localidadFilters } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            canjeados: { $sum: { $cond: ['$canjeado', 1, 0] } },
            lastUpdate: { $max: '$updatedAt' }
          }
        }
      ]).maxTimeMS(3000) // Timeout de 3 segundos
    ]);

    const hasChanges = modifiedCount > 0;

    res.json({
      success: true,
      data: {
        hasChanges,
        modifiedCount,
        stats: stats[0] || { total: 0, canjeados: 0, lastUpdate: null },
        checkTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking tickets changes for staff:', error);
    
    // Si es timeout, retornar respuesta parcial
    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Servicio temporalmente sobrecargado, intente de nuevo',
        retry: true
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener localidades disponibles (del CSV)
const getLocalidadesDisponibles = async (req, res) => {
  try {
    // Usar el modelo de la colección activa (misma que /api/tickets)
    const TicketModel = req.TicketModel || Ticket;

    // Extraer localidades únicas de la columna 'Seat' de los tickets
    const localidades = await TicketModel.distinct('Seat');
    
    // Ordenar alfabéticamente y filtrar vacíos
    const localidadesOrdenadas = localidades
      .filter(loc => loc && loc.trim())
      .map(loc => loc.trim())
      .sort();

    res.json({
      success: true,
      data: {
        localidades: localidadesOrdenadas,
        total: localidadesOrdenadas.length,
        disponibles: localidadesOrdenadas
      }
    });
  } catch (error) {
    console.error('Error al obtener localidades disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener localidades disponibles',
      error: error.message
    });
  }
};

module.exports = {
  getPuntosVenta,
  createPuntoVenta,
  updatePuntoVenta,
  deletePuntoVenta,
  getTicketsByPuntoVenta,
  getEstadisticasPuntoVenta,
  getTicketsForStaff,
  checkTicketsChanges,
  checkTicketsChangesForStaff,
  getLocalidadesDisponibles
};
