// Pruebas del controlador de canje (individual y masivo): confirman que las
// validaciones de formato de celular y nombre agregadas al backend rechazan
// la petición con 400 ANTES de tocar la base de datos (Ticket.findOne /
// Ticket.find nunca se llaman en esos casos). Los modelos se mockean para no
// depender de una conexión real a MongoDB.

jest.mock('../../src/models/Ticket');
jest.mock('../../src/models/AuditLog');

const Ticket = require('../../src/models/Ticket');
const AuditLog = require('../../src/models/AuditLog');
const { canjeTicket, bulkCanjeTickets } = require('../../src/controllers/ticketController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('canjeTicket - validación de celular', () => {
  test('rechaza un celular con letras sin consultar la base de datos', async () => {
    const req = {
      params: { id: 'TICKET-1' },
      body: { quienRetira: 'Titular', celular: '099abc123' },
      user: { _id: 'u1', puntoTrabajo: 'Local A' }
    };
    const res = mockRes();

    await canjeTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('celular') })
    );
    expect(Ticket.findOne).not.toHaveBeenCalled();
  });

  test('acepta un celular numérico y continúa hacia la búsqueda del ticket', async () => {
    Ticket.findOne = jest.fn().mockResolvedValue(null); // ticket inexistente -> 404, pero ya pasó la validación

    const req = {
      params: { id: 'TICKET-1' },
      body: { quienRetira: 'Titular', celular: '0991234567' },
      user: { _id: 'u1', puntoTrabajo: 'Local A' }
    };
    const res = mockRes();

    await canjeTicket(req, res);

    expect(Ticket.findOne).toHaveBeenCalledWith({ 'Ticket ID': 'TICKET-1' });
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('canjeTicket - validación de nombre de "quien retira" (Otro)', () => {
  test('rechaza un nombre con números sin consultar la base de datos', async () => {
    const req = {
      params: { id: 'TICKET-1' },
      body: {
        quienRetira: 'Otro',
        celular: '0991234567',
        parentesco: 'Hermano/a',
        quienOtro: 'Juan123'
      },
      user: { _id: 'u1', puntoTrabajo: 'Local A' }
    };
    const res = mockRes();

    await canjeTicket(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('nombre') })
    );
    expect(Ticket.findOne).not.toHaveBeenCalled();
  });
});

describe('bulkCanjeTickets - validación de celular y nombre', () => {
  test('rechaza celular inválido sin consultar tickets', async () => {
    const req = {
      body: {
        ticketIds: ['T1', 'T2'],
        canjeData: { quienRetira: 'Titular', celular: '099-123-4567' }
      },
      user: { _id: 'u1', puntoTrabajo: 'Local A' }
    };
    const res = mockRes();

    await bulkCanjeTickets(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Ticket.find).not.toHaveBeenCalled();
    expect(AuditLog.insertMany).not.toHaveBeenCalled();
  });

  test('rechaza nombre de "quien retira" inválido cuando quienRetira es "Otro"', async () => {
    const req = {
      body: {
        ticketIds: ['T1', 'T2'],
        canjeData: {
          quienRetira: 'Otro',
          celular: '0991234567',
          parentesco: 'Amigo/a',
          quienOtro: 'María2'
        }
      },
      user: { _id: 'u1', puntoTrabajo: 'Local A' }
    };
    const res = mockRes();

    await bulkCanjeTickets(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Ticket.find).not.toHaveBeenCalled();
  });
});
