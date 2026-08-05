import api from './api';

export const authService = {
  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Cambiar contraseña
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Obtener perfil
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

export const userService = {
  // Crear usuario
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Obtener usuarios
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // Actualizar usuario
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Eliminar usuario
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

export const ticketService = {
  // Obtener tickets con filtros
  getTickets: async (params = {}) => {
    const response = await api.get('/tickets', { params });
    return response.data;
  },

  // Obtener información de colección activa
  getActiveCollection: async () => {
    const response = await api.get('/tickets/active-collection');
    return response.data;
  },

  // Imprimir ticket
  printTicket: async (ticketId, printData) => {
    const response = await api.post(`/tickets/${ticketId}/print`, printData);
    return response.data;
  },

  // Reimprimir ticket
  reprintTicket: async (ticketId, reprintData) => {
    const response = await api.post(`/tickets/${ticketId}/reprint`, reprintData);
    return response.data;
  },

  // Obtener tickets por transacción
  getTicketsByTransaction: async (transactionId) => {
    const response = await api.get(`/tickets/transaction/${transactionId}`);
    return response.data;
  },

  // Obtener estadísticas
  getStats: async (params = {}) => {
    const response = await api.get('/tickets/stats', { params });
    return response.data;
  }
};

export const printerSettingsService = {
  // Obtener configuración de impresión (habilitado + colores)
  getSettings: async () => {
    const response = await api.get('/printer-settings');
    return response.data;
  },

  // Habilitar/deshabilitar la función de impresión (jefe)
  updateEnabled: async (enabled) => {
    const response = await api.put('/printer-settings', { enabled });
    return response.data;
  },

  // Obtener tipos de ticket detectados (campo "Ticket") (jefe)
  getTicketTypes: async () => {
    const response = await api.get('/printer-settings/ticket-types');
    return response.data;
  },

  // Actualizar colores por tipo de ticket (jefe)
  updateColors: async (ticketColors) => {
    const response = await api.put('/printer-settings/colors', { ticketColors });
    return response.data;
  }
};

export const printRequestService = {
  // Obtener solicitudes de impresión por estado: pendiente | enviada | completada (impresor_cola, jefe)
  getQueue: async (estado = 'pendiente', params = {}) => {
    const response = await api.get('/print-requests', { params: { estado, ...params } });
    return response.data;
  },

  // Paso 1: enviar a imprimir una o varias solicitudes (pasan a "enviada")
  sendToPrint: async (requestIds) => {
    const response = await api.post('/print-requests/send', { requestIds });
    return response.data;
  },

  // Paso 2: confirmar que se imprimieron correctamente (pasan a "completada" / Impresos)
  confirmPrint: async (requestIds) => {
    const response = await api.post('/print-requests/confirm', { requestIds });
    return response.data;
  }
};

export const auditService = {
  // Obtener logs de auditoría
  getLogs: async (params = {}) => {
    const response = await api.get('/audit', { params });
    return response.data;
  },

  // Obtener resumen de auditoría
  getSummary: async (params = {}) => {
    const response = await api.get('/audit/summary', { params });
    return response.data;
  }
};
