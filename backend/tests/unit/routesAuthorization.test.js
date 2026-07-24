// Pruebas de "cableado" de rutas: no ejecutan una petición HTTP real ni tocan
// la base de datos, inspeccionan directamente la pila de middlewares que
// Express registró para cada ruta. Sirven como prueba de regresión de dos
// correcciones aplicadas al proyecto:
//
//  1) Canje y canje masivo dejaron de registrar el log de auditoría dos veces
//     (antes: el middleware auditLogger() Y el controlador creaban cada uno
//     su propio AuditLog para la misma acción).
//  2) STAFF ahora está autorizado para /tickets/bulk-canje (antes solo Jefe).

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const ticketsRouter = require('../../src/routes/tickets');
const authRouter = require('../../src/routes/auth');
const usersRouter = require('../../src/routes/users');

function findRoute(router, path) {
  const layer = router.stack.find((l) => l.route && l.route.path === path);
  if (!layer) throw new Error(`No se encontró la ruta ${path}`);
  return layer.route;
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Cantidad de middlewares por ruta (sin logging duplicado)', () => {
  test('POST /tickets/bulk-canje ya no lleva auditLogger (solo auth, authorize, controlador)', () => {
    const route = findRoute(ticketsRouter, '/bulk-canje');
    expect(route.stack).toHaveLength(3);
    expect(route.stack.map((s) => s.name)).toEqual(['auth', '<anonymous>', 'bulkCanjeTickets']);
  });

  test('POST /tickets/:id/canje ya no lleva auditLogger (solo auth, authorize, controlador)', () => {
    const route = findRoute(ticketsRouter, '/:id/canje');
    expect(route.stack).toHaveLength(3);
    expect(route.stack.map((s) => s.name)).toEqual(['auth', '<anonymous>', 'canjeTicket']);
  });

  test('POST /tickets/:id/print sigue usando auditLogger (único registro de auditoría para esa acción)', () => {
    const route = findRoute(ticketsRouter, '/:id/print');
    expect(route.stack).toHaveLength(4);
  });

  test('POST /tickets/:id/reprint sigue usando auditLogger (único registro de auditoría para esa acción)', () => {
    const route = findRoute(ticketsRouter, '/:id/reprint');
    expect(route.stack).toHaveLength(4);
  });

  test('POST /auth/change-password ya no lleva auditLogger (el controlador ya audita)', () => {
    const route = findRoute(authRouter, '/change-password');
    expect(route.stack).toHaveLength(2);
    expect(route.stack.map((s) => s.name)).toEqual(['auth', 'changePassword']);
  });

  test('POST /auth/logout ya no lleva auditLogger (el controlador ya audita)', () => {
    const route = findRoute(authRouter, '/logout');
    expect(route.stack).toHaveLength(2);
    expect(route.stack.map((s) => s.name)).toEqual(['auth', 'logout']);
  });

  test('POST /users sigue usando auditLogger (único mecanismo de auditoría para creación de usuario)', () => {
    const route = findRoute(usersRouter, '/');
    const postRoute = usersRouter.stack.find((l) => l.route && l.route.path === '/' && l.route.methods.post);
    expect(postRoute.route.stack).toHaveLength(4);
  });
});

describe('Autorización real de /tickets/bulk-canje (Jefe y Staff, no Impresor)', () => {
  const route = findRoute(ticketsRouter, '/bulk-canje');
  const authorizeMiddleware = route.stack[1].handle; // auth, [authorize], controlador

  test('permite el paso a un usuario con rol "staff"', () => {
    const req = { user: { rol: 'staff' } };
    const res = mockRes();
    const next = jest.fn();

    authorizeMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('permite el paso a un usuario con rol "jefe"', () => {
    const req = { user: { rol: 'jefe' } };
    const res = mockRes();
    const next = jest.fn();

    authorizeMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('bloquea con 403 a un usuario con rol "impresor"', () => {
    const req = { user: { rol: 'impresor' } };
    const res = mockRes();
    const next = jest.fn();

    authorizeMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
