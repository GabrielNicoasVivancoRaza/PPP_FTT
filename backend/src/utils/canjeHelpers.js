// La retirada de tickets (canje) se autoriza a nivel de Transaction ID: es
// común que una persona retire varios boletos de la misma compra. Pero NO se
// asume que sean todos: quien canjea elige explícitamente cuáles se completan
// con la misma información (checkboxes en el modal de canje).

/**
 * Propaga los datos de canje a los tickets seleccionados de una transacción.
 *
 * @param ticketIdsSeleccionados Ticket IDs elegidos por el usuario. Si viene
 *        vacío o no se pasa, NO se propaga a ningún otro ticket.
 * Devuelve los tickets efectivamente actualizados.
 */
const propagateCanjeToTransaction = async (
  TicketModel,
  transactionId,
  canjeInfo,
  ticketIdsSeleccionados = [],
  now = new Date()
) => {
  if (!Array.isArray(ticketIdsSeleccionados) || ticketIdsSeleccionados.length === 0) {
    return [];
  }

  const { usuarioId, puntoTrabajo, quienRetira, celular, cedulaQuienRetira, parentesco, parentescoDescripcion, quienOtro } = canjeInfo;

  const setFields = {
    canjeado: true,
    fechaCanje: now,
    usuarioResponsable: usuarioId,
    usuarioCanje: usuarioId,
    puntoTrabajo,
    puntoCanje: puntoTrabajo,
    quienRetira,
    celular,
    cedulaQuienRetira
  };

  const unsetFields = {};
  if (quienRetira === 'Otro') {
    setFields.parentesco = parentesco;
    setFields.quienOtro = quienOtro;
    if (parentesco === 'Otro' && parentescoDescripcion?.trim()) {
      setFields.parentescoDescripcion = parentescoDescripcion.trim();
    } else {
      unsetFields.parentescoDescripcion = '';
    }
  } else {
    unsetFields.parentesco = '';
    unsetFields.quienOtro = '';
    unsetFields.parentescoDescripcion = '';
  }

  const updateOp = { $set: setFields };
  if (Object.keys(unsetFields).length > 0) updateOp.$unset = unsetFields;

  // Solo tickets de esa transacción, elegidos por el usuario, que no estén
  // ya canjeados ni marcados como fraude/eliminados.
  // OJO: se usa { $ne: true } y no "false" porque los tickets importados
  // directo a Mongo pueden no tener esos campos definidos.
  const filtro = {
    'Transaction ID': transactionId,
    'Ticket ID': { $in: ticketIdsSeleccionados },
    canjeado: { $ne: true },
    fraude: { $ne: true },
    eliminado: { $ne: true }
  };

  const aActualizar = await TicketModel.find(filtro);
  if (aActualizar.length === 0) return [];

  await TicketModel.updateMany(filtro, updateOp);

  return TicketModel.find({
    'Ticket ID': { $in: aActualizar.map(t => t['Ticket ID']) }
  });
};

module.exports = { propagateCanjeToTransaction };
