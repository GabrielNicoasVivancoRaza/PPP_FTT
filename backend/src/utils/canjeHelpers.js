// La retirada de tickets (canje) se autoriza a nivel de Transaction ID: si
// se completa el formulario "quién retira" para un ticket de una
// transacción, esa misma información debe aplicarse a todos los demás
// tickets de esa transacción que todavía no hayan sido canjeados, ya que en
// la práctica se retiran/entregan todos juntos.

// Propaga los datos de canje (quién retira, celular, etc.) a todos los
// tickets de una transacción que aún no estén canjeados. Devuelve todos los
// tickets de esa transacción (incluyendo el que ya estaba canjeado).
const propagateCanjeToTransaction = async (TicketModel, transactionId, canjeInfo, now = new Date()) => {
  const { usuarioId, puntoTrabajo, quienRetira, celular, parentesco, quienOtro } = canjeInfo;

  const setFields = {
    canjeado: true,
    fechaCanje: now,
    usuarioResponsable: usuarioId,
    usuarioCanje: usuarioId,
    puntoTrabajo,
    puntoCanje: puntoTrabajo,
    quienRetira,
    celular
  };

  const unsetFields = {};
  if (quienRetira === 'Otro') {
    setFields.parentesco = parentesco;
    setFields.quienOtro = quienOtro;
  } else {
    unsetFields.parentesco = '';
    unsetFields.quienOtro = '';
  }

  const updateOp = { $set: setFields };
  if (Object.keys(unsetFields).length > 0) updateOp.$unset = unsetFields;

  // OJO: usar { $ne: true } y no "false". Muchos tickets importados desde el
  // CSV nunca pasaron por Mongoose (import directo a Mongo), por lo que el
  // campo "canjeado" puede no existir en el documento. Una condición
  // "canjeado: false" NO matchea documentos donde el campo simplemente no
  // existe, dejándolos fuera de la propagación.
  await TicketModel.updateMany(
    { 'Transaction ID': transactionId, canjeado: { $ne: true } },
    updateOp
  );

  return TicketModel.find({ 'Transaction ID': transactionId });
};

module.exports = { propagateCanjeToTransaction };
