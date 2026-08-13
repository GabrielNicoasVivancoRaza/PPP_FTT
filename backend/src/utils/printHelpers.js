// La impresión física en SquadUp se hace por Transaction ID: al imprimir una
// transacción se imprimen TODOS los boletos de esa transacción (para el tipo
// de ticket/color que se está procesando), hayan sido canjeados o no
// individualmente. Por eso, cada vez que se registra una impresión, hay que
// propagar el estado a todos los tickets de esa Transaction ID + mismo tipo,
// no solo al ticket o a los tickets que dispararon la acción.

// Devuelve los Ticket ID de todos los tickets de una transacción (+ tipo,
// opcional) que todavía no han sido impresos. Se usa para construir/ampliar
// una solicitud de impresión con el conjunto completo, no solo el ticket que
// el staff acaba de canjear.
const getUnprintedTransactionTicketIds = async (TicketModel, transactionId, tipo) => {
  // { $ne: true } en vez de "false": tickets importados directo a Mongo
  // (sin pasar por Mongoose) pueden no tener el campo "impreso" en absoluto,
  // y "impreso: false" no matchea documentos donde el campo no existe.
  const query = { 'Transaction ID': transactionId, impreso: { $ne: true } };
  if (tipo) query['Ticket'] = tipo;
  const tickets = await TicketModel.find(query);
  return tickets.map(t => t['Ticket ID']);
};

// Marca como impresos todos los tickets de una transacción que compartan el
// mismo tipo (campo "Ticket"). Si no se especifica tipo, aplica a toda la
// transacción. Los tickets que aún no tengan punto de trabajo asignado
// (porque nunca pasaron por canje individual) reciben el punto de trabajo
// de referencia para que puedan notificarse por socket. Devuelve todos los
// tickets de esa transacción/tipo (incluyendo los que ya estaban impresos).
const markTransactionPrinted = async (TicketModel, transactionId, tipo, fallbackPuntoTrabajo, now = new Date()) => {
  const baseQuery = { 'Transaction ID': transactionId };
  if (tipo) baseQuery['Ticket'] = tipo;

  // { $ne: true } por la misma razón: tickets con el campo "impreso" ausente
  // (importados directo a Mongo) no deben quedar fuera de la propagación.
  const pendientes = await TicketModel.find({ ...baseQuery, impreso: { $ne: true } });

  if (pendientes.length > 0) {
    const bulkOps = pendientes.map(ticket => ({
      updateOne: {
        filter: { _id: ticket._id },
        update: {
          $set: {
            impreso: true,
            fechaImpresion: now,
            ...(ticket.puntoTrabajo ? {} : { puntoTrabajo: fallbackPuntoTrabajo })
          }
        }
      }
    }));
    await TicketModel.bulkWrite(bulkOps);
  }

  return TicketModel.find(baseQuery);
};

// Emite 'ticket-updated' a la sala común de tickets, donde están todas las
// pantallas que muestran la tabla (sin importar rol ni punto de venta).
const emitTicketUpdates = (io, tickets, action) => {
  if (!io) return;
  const timestamp = new Date().toISOString();
  tickets.forEach(ticket => {
    io.to('tickets').emit('ticket-updated', {
      action,
      ticket: ticket.toObject ? ticket.toObject() : ticket,
      timestamp
    });
  });
};

module.exports = { getUnprintedTransactionTicketIds, markTransactionPrinted, emitTicketUpdates };
