// Pruebas del controlador de usuarios: confirman que el nombre solo acepta
// letras al crear y al editar un usuario. El modelo User se mockea para no
// depender de una conexión real a MongoDB.

jest.mock('../../src/models/User');

const User = require('../../src/models/User');
const { createUser, updateUser } = require('../../src/controllers/userController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createUser - validación de nombre', () => {
  test('rechaza un nombre con números sin consultar si el usuario ya existe', async () => {
    const req = {
      body: { nombre: 'Ana2', usuario: 'ana@test.com', rol: 'staff', puntoTrabajo: 'Local A' },
      user: { _id: 'jefe1' }
    };
    const res = mockRes();

    await createUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: expect.stringContaining('nombre') })
    );
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('acepta un nombre válido y continúa el flujo normal', async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    const saveMock = jest.fn().mockResolvedValue(undefined);
    User.mockImplementation(() => ({ save: saveMock, nombre: 'Ana Torres' }));

    const req = {
      body: { nombre: 'Ana Torres', usuario: 'ana@test.com', rol: 'staff', puntoTrabajo: 'Local A' },
      user: { _id: 'jefe1' }
    };
    const res = mockRes();

    await createUser(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ usuario: 'ana@test.com' });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('updateUser - validación de nombre', () => {
  test('rechaza un nombre con números y no guarda cambios', async () => {
    const mockUser = { _id: 'u2', rol: 'staff', save: jest.fn() };
    User.findById = jest.fn().mockResolvedValue(mockUser);

    const req = {
      params: { id: 'u2' },
      body: { nombre: 'Pedro3' },
      user: { _id: 'jefe1' }
    };
    const res = mockRes();

    await updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUser.save).not.toHaveBeenCalled();
  });

  test('acepta un nombre válido y guarda los cambios', async () => {
    const mockUser = { _id: 'u2', rol: 'staff', save: jest.fn().mockResolvedValue(undefined) };
    User.findById = jest.fn().mockResolvedValue(mockUser);

    const req = {
      params: { id: 'u2' },
      body: { nombre: 'Pedro Gómez' },
      user: { _id: 'jefe1' }
    };
    const res = mockRes();

    await updateUser(req, res);

    expect(mockUser.nombre).toBe('Pedro Gómez');
    expect(mockUser.save).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});
