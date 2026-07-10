const Ticket = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');

// @desc    Obtener todos los tickets con filtros
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res) => {
  try {
    const { 
      search, 
      seatSearch,
      ticketIdSearch,
      puntoTrabajo, 
      impreso, 
      page = 1, 
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    const filters = [];
    
    // Filtro específico por Ticket ID
    if (ticketIdSearch && ticketIdSearch.trim()) {
      // Ticket ID es String en el schema
      filters.push({ 'Ticket ID': ticketIdSearch.trim() });
    }
    
    // Filtro de búsqueda general
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const searchRegex = new RegExp(trimmedSearch, 'i');
      
      filters.push({
        $or: [
          { 'First Name': searchRegex },
          { 'Last Name': searchRegex },
          { 'Email': searchRegex },
          { 'Ticket ID': trimmedSearch },
          { 'Transaction ID': trimmedSearch },
          { 'Numero de Cedula:': searchRegex },
          { 'Número de Cédula: ': searchRegex }
        ]
      });
    }
    
    // Filtro por asiento
    if (seatSearch && seatSearch.trim()) {
      const seatRegex = new RegExp(seatSearch.trim(), 'i');
      filters.push({ 'Seat': seatRegex });
    }

    // Combinar filtros con $and si hay más de uno
    if (filters.length > 1) {
      Object.assign(query, { $and: filters });
    } else if (filters.length === 1) {
      Object.assign(query, filters[0]);
    }

    // Filtro por punto de trabajo (para staff)
    if (req.user.rol === 'staff' && req.user.puntoTrabajo) {
      query.puntoTrabajo = req.user.puntoTrabajo;
    } else if (puntoTrabajo && req.user.rol === 'jefe') {
      query.puntoTrabajo = puntoTrabajo;
    }

    // Filtro por estado de canje
    if (impreso !== undefined) {
      query.canjeado = impreso === 'true';
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const [tickets, total] = await Promise.all([
      TicketModel.find(query)
        .populate('usuarioResponsable', 'nombre usuario email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      TicketModel.countDocuments(query)
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
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Imprimir ticket
// @route   POST /api/tickets/:id/print
// @access  Private
const printTicket = async (req, res) => {
  try {
    const { quienRetira, quienOtro, parentesco, celular } = req.body;
    const ticketId = req.params.id;

    if (!quienRetira || !celular) {
      return res.status(400).json({
        success: false,
        message: 'Quien retira y celular son campos obligatorios'
      });
    }

    if (quienRetira === 'Otro') {
      if (!quienOtro) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar quién retira cuando selecciona "Otro"'
        });
      }
      if (!parentesco) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar el parentesco cuando selecciona "Otro"'
        });
      }
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const ticket = await TicketModel.findOne({ 'Ticket ID': ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Solo jefe puede reimprimir tickets ya impresos
    if (ticket.impreso && req.user.rol !== 'jefe') {
      return res.status(400).json({
        success: false,
        message: 'Este ticket ya fue impreso'
      });
    }

    // Actualizar ticket
    ticket.impreso = true;
    ticket.fechaImpresion = new Date();
    ticket.usuarioResponsable = req.user._id;
    ticket.puntoTrabajo = req.user.puntoTrabajo;
    ticket.quienRetira = quienRetira;
    ticket.celular = celular;
    
    // Solo establecer campos adicionales si es "Otro"
    if (quienRetira === 'Otro') {
      ticket.quienOtro = quienOtro;
      ticket.parentesco = parentesco;
    } else {
      ticket.quienOtro = undefined;
      ticket.parentesco = undefined;
    }

    await ticket.save();

    // Emitir evento de Socket.IO para actualización en tiempo real
    const io = req.app.get('io');
    if (io) {
      // Emitir a todos los usuarios del mismo punto de venta
      if (ticket.puntoVenta) {
        io.to(`punto-venta-${ticket.puntoVenta}`).emit('ticket-updated', {
          action: 'print',
          ticket: ticket.toObject(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Emitir a staff del punto de trabajo
      if (req.user.puntoTrabajo) {
        io.to(`staff-${req.user.puntoTrabajo}`).emit('ticket-updated', {
          action: 'print',
          ticket: ticket.toObject(),
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Ticket impreso exitosamente',
      ticket
    });

  } catch (error) {
    console.error('Error al imprimir ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Reimprimir ticket
// @route   POST /api/tickets/:id/reprint
// @access  Private (solo jefe e impresor)
const reprintTicket = async (req, res) => {
  try {
    const { motivo } = req.body;
    const ticketId = req.params.id;

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'Motivo de reimpresión es obligatorio'
      });
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const ticket = await TicketModel.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    if (!ticket.impreso) {
      return res.status(400).json({
        success: false,
        message: 'No se puede reimprimir un ticket que no ha sido impreso'
      });
    }

    // Agregar reimpresión al historial
    ticket.reimpresiones.push({
      fecha: new Date(),
      motivo,
      usuario: req.user._id,
      puntoTrabajo: req.user.puntoTrabajo
    });

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket reimpreso exitosamente',
      ticket
    });

  } catch (error) {
    console.error('Error al reimprimir ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener tickets por transaction ID
// @route   GET /api/tickets/transaction/:transactionId
// @access  Private
const getTicketsByTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const tickets = await TicketModel.find({ transactionId })
      .populate('usuarioResponsable', 'nombre usuario')
      .sort({ seat: 1 });

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron tickets para esta transacción'
      });
    }

    res.json({
      success: true,
      tickets
    });

  } catch (error) {
    console.error('Error al obtener tickets por transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener estadísticas de tickets
// @route   GET /api/tickets/stats
// @access  Private (solo jefe)
const getTicketStats = async (req, res) => {
  try {
    const { puntoTrabajo, fechaInicio, fechaFin } = req.query;

    const matchQuery = {};
    
    if (puntoTrabajo) {
      matchQuery.puntoTrabajo = puntoTrabajo;
    }

    // Filtros de fecha para canjes
    if (fechaInicio || fechaFin) {
      matchQuery.fechaCanje = {};
      if (fechaInicio) {
        matchQuery.fechaCanje.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        matchQuery.fechaCanje.$lte = new Date(fechaFin);
      }
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const [
      totalTickets, 
      ticketsCanjeados,
      ticketsPorDia,
      ticketsPorPunto
    ] = await Promise.all([
      // Total de tickets en el sistema
      TicketModel.countDocuments(),
      
      // Tickets canjeados
      TicketModel.countDocuments({ canjeado: true, ...matchQuery }),
      
      // Evolución diaria de canjes
      TicketModel.aggregate([
        { $match: { canjeado: true, ...matchQuery } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$fechaCanje" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Tickets canjeados por punto de trabajo
      TicketModel.aggregate([
        { $match: { canjeado: true } },
        {
          $group: {
            _id: "$puntoTrabajo",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    const porcentajeCanjeados = totalTickets > 0 ? (ticketsCanjeados / totalTickets) * 100 : 0;
    const ticketsRestantes = totalTickets - ticketsCanjeados;

    res.json({
      success: true,
      stats: {
        totalTickets,
        ticketsCanjeados,
        ticketsRestantes,
        porcentajeCanjeados: Math.round(porcentajeCanjeados * 100) / 100,
        evolucionDiaria: ticketsPorDia,
        ticketsPorPunto
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Realizar canje de ticket
// @route   POST /api/tickets/:id/canje
// @access  Private
const canjeTicket = async (req, res) => {
  try {
    const { quienRetira, parentesco, quienOtro, celular } = req.body;
    const ticketId = req.params.id;

    // Validaciones básicas
    if (!quienRetira || !celular) {
      return res.status(400).json({
        success: false,
        message: 'Quien retira y celular son campos obligatorios'
      });
    }

    // Validaciones condicionales para "Otro"
    if (quienRetira === 'Otro') {
      if (!parentesco) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar el parentesco cuando selecciona "Otro"'
        });
      }
      if (!quienOtro) {
        return res.status(400).json({
          success: false,
          message: 'Debe especificar el nombre de quien retira cuando selecciona "Otro"'
        });
      }
    }

    // Validar que quienRetira sea una opción válida
    const opcionesValidas = ['Titular', 'Titular Compra', 'Otro'];
    if (!opcionesValidas.includes(quienRetira)) {
      return res.status(400).json({
        success: false,
        message: 'Opción de retiro no válida'
      });
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    const ticket = await TicketModel.findOne({ 'Ticket ID': ticketId });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar si el ticket ya fue canjeado
    if (ticket.canjeado) {
      return res.status(400).json({
        success: false,
        message: 'Este ticket ya fue canjeado'
      });
    }

    // Actualizar ticket con información de canje
    ticket.canjeado = true;
    ticket.fechaCanje = new Date();
    ticket.usuarioResponsable = req.user._id;
    ticket.usuarioCanje = req.user._id;
    ticket.puntoTrabajo = req.user.puntoTrabajo;
    ticket.puntoCanje = req.user.puntoTrabajo;
    ticket.quienRetira = quienRetira;
    ticket.celular = celular;
    
    // Solo establecer campos adicionales si es "Otro"
    if (quienRetira === 'Otro') {
      ticket.parentesco = parentesco;
      ticket.quienOtro = quienOtro;
    } else {
      // Limpiar campos si no es "Otro"
      ticket.parentesco = undefined;
      ticket.quienOtro = undefined;
    }

    await ticket.save();

    // Crear log de auditoría de forma segura
    try {
      const auditDetails = {
        ticketId: ticket['Ticket ID'],
        quienRetira,
        celular,
        puntoTrabajo: req.user.puntoTrabajo || 'No asignado'
      };
      
      // Solo incluir campos adicionales en el log si es "Otro"
      if (quienRetira === 'Otro') {
        auditDetails.parentesco = parentesco;
        auditDetails.quienOtro = quienOtro;
      }
      
      await AuditLog.create({
        tipo: 'canje',
        usuario: req.user._id,
        ticketId: ticket['Ticket ID'].toString(),
        transactionId: ticket['Transaction ID']?.toString(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: auditDetails,
        ip: req.ip || 'Unknown'
      });
    } catch (auditError) {
      console.error('Error al crear log de auditoría:', auditError);
      // No fallar el canje por problemas de auditoría
    }

    // Populate para devolver información completa del usuario
    await ticket.populate('usuarioResponsable', 'nombre usuario email');

    // Emitir evento de Socket.IO para actualización en tiempo real
    const io = req.app.get('io');
    if (io) {
      // Emitir a todos los usuarios del mismo punto de venta
      if (ticket.puntoVenta) {
        io.to(`punto-venta-${ticket.puntoVenta}`).emit('ticket-updated', {
          action: 'canje',
          ticket: ticket.toObject(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Emitir a staff del punto de trabajo
      if (req.user.puntoTrabajo) {
        io.to(`staff-${req.user.puntoTrabajo}`).emit('ticket-updated', {
          action: 'canje',
          ticket: ticket.toObject(),
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      message: 'Ticket canjeado exitosamente',
      ticket,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en canje ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Realizar canje masivo de tickets
// @route   POST /api/tickets/bulk-canje
// @access  Private (Jefe only)
const bulkCanjeTickets = async (req, res) => {
  try {
    const { ticketIds, canjeData } = req.body;
    const { quienRetira, parentesco, celular, quienOtro } = canjeData;

    // Validaciones
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de ticket IDs'
      });
    }

    if (!quienRetira || !celular) {
      return res.status(400).json({
        success: false,
        message: 'Quien retira y celular son campos obligatorios'
      });
    }

    if (quienRetira === 'Otro') {
      if (!parentesco || !quienOtro) {
        return res.status(400).json({
          success: false,
          message: 'Parentesco y nombre son obligatorios cuando selecciona "Otro"'
        });
      }
    }

    // Usar el modelo de la colección activa
    const TicketModel = req.TicketModel || Ticket;
    
    // Buscar todos los tickets (canjeados y no canjeados) para reportar
    const allTickets = await TicketModel.find({ 
      'Ticket ID': { $in: ticketIds }
    });

    // Separar tickets canjeados y no canjeados
    const ticketsToRedeem = allTickets.filter(t => !t.canjeado);
    const alreadyRedeemed = allTickets.filter(t => t.canjeado);

    if (allTickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron los tickets especificados'
      });
    }

    if (ticketsToRedeem.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Todos los tickets (${alreadyRedeemed.length}) ya fueron canjeados previamente`,
        data: {
          alreadyRedeemed: alreadyRedeemed.length,
          processed: 0
        }
      });
    }

    // Preparar datos de actualización
    const updateData = {
      canjeado: true,
      fechaCanje: new Date(),
      usuarioResponsable: req.user._id,
      usuarioCanje: req.user._id,
      puntoTrabajo: req.user.puntoTrabajo,
      puntoCanje: req.user.puntoTrabajo,
      quienRetira,
      celular
    };

    if (quienRetira === 'Otro') {
      updateData.parentesco = parentesco;
      updateData.quienOtro = quienOtro;
    }

    // Actualizar solo tickets no canjeados en una operación bulk
    const bulkOps = ticketsToRedeem.map(ticket => ({
      updateOne: {
        filter: { _id: ticket._id },
        update: { $set: updateData }
      }
    }));

    const bulkResult = await TicketModel.bulkWrite(bulkOps);

    // Crear logs de auditoría solo para los tickets canjeados ahora
    const auditLogs = ticketsToRedeem.map(ticket => {
      const auditDetails = {
        ticketId: ticket['Ticket ID'],
        quienRetira,
        celular,
        puntoTrabajo: req.user.puntoTrabajo || 'No asignado',
        bulkOperation: true,
        totalTickets: ticketsToRedeem.length,
        alreadyRedeemed: alreadyRedeemed.length
      };
      
      if (quienRetira === 'Otro') {
        auditDetails.parentesco = parentesco;
        auditDetails.quienOtro = quienOtro;
      }
      
      return {
        tipo: 'canje_masivo',
        usuario: req.user._id,
        ticketId: ticket['Ticket ID'].toString(),
        transactionId: ticket['Transaction ID']?.toString(),
        puntoTrabajo: req.user.puntoTrabajo,
        detalles: auditDetails,
        ip: req.ip || 'Unknown'
      };
    });

    // Insertar logs en batch
    try {
      await AuditLog.insertMany(auditLogs);
    } catch (auditError) {
      console.error('Error al crear logs de auditoría:', auditError);
    }

    // Obtener tickets actualizados con populate
    const updatedTickets = await TicketModel.find({ 
      'Ticket ID': { $in: ticketIds }
    }).populate('usuarioResponsable', 'nombre usuario email');

    // Emitir eventos de Socket.IO
    const io = req.app.get('io');
    if (io) {
      updatedTickets.forEach(ticket => {
        if (ticket.puntoVenta) {
          io.to(`punto-venta-${ticket.puntoVenta}`).emit('ticket-updated', {
            action: 'canje',
            ticket: ticket.toObject(),
            timestamp: new Date().toISOString()
          });
        }
        
        if (req.user.puntoTrabajo) {
          io.to(`staff-${req.user.puntoTrabajo}`).emit('ticket-updated', {
            action: 'canje',
            ticket: ticket.toObject(),
            timestamp: new Date().toISOString()
          });
        }
      });
    }

    // Mensaje personalizado según resultados
    let message = `${bulkResult.modifiedCount} tickets canjeados exitosamente`;
    if (alreadyRedeemed.length > 0) {
      message += `. ${alreadyRedeemed.length} ya estaban canjeados`;
    }

    res.json({
      success: true,
      message,
      data: {
        processed: ticketsToRedeem.length,
        updated: bulkResult.modifiedCount,
        alreadyRedeemed: alreadyRedeemed.length,
        total: allTickets.length,
        tickets: updatedTickets
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en canje masivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getTickets,
  printTicket,
  reprintTicket,
  getTicketsByTransaction,
  getTicketStats,
  canjeTicket,
  bulkCanjeTickets
};
