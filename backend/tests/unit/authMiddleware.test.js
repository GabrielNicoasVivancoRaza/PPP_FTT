process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../../src/models/User');
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const { auth, authorize } = require('../../src/middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware authorize()', () => {
  test('permite el acceso si el rol del usuario está en la lista', () => {
    const req = { user: { rol: 'staff' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('jefe', 'staff')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('bloquea con 403 si el rol no está en la lista', () => {
    const req = { user: { rol: 'impresor' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('jefe', 'staff')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('bloquea con 401 si no hay usuario autenticado en la petición', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    authorize('jefe')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('middleware auth()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rechaza la petición si el token es inválido o expiró', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req = { header: () => 'Bearer tokenvencido' };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza la petición si no viene token', async () => {
    const req = { header: () => undefined };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza la petición si el usuario del token no existe o está inactivo', async () => {
    jwt.verify.mockReturnValue({ id: 'u1' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const req = { header: () => 'Bearer faketoken' };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('adjunta req.user y continúa si el token y el usuario son válidos', async () => {
    jwt.verify.mockReturnValue({ id: 'u1' });
    const fakeUser = { _id: 'u1', activo: true, rol: 'staff' };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });

    const req = { header: () => 'Bearer faketoken' };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
