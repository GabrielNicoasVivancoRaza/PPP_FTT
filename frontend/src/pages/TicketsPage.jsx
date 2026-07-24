import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import { onlyDigits, onlyLetters, isValidPhone, isValidName } from '../utils/validators';
import 'bootstrap/dist/css/bootstrap.min.css';

const TicketsPage = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [selectedPuntoVenta, setSelectedPuntoVenta] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [seatSearch, setSeatSearch] = useState('');
  const [ticketIdSearch, setTicketIdSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' o 'desc'
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [printRequests, setPrintRequests] = useState([]); // Estado de peticiones de impresión
  const [printForm, setPrintForm] = useState({
    quienRetira: '',
    parentesco: '',
    quienOtro: '',
    celular: ''
  });
  const [error, setError] = useState('');
  
  // Estados para selección múltiple (admin y staff)
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [showBulkCanjeModal, setShowBulkCanjeModal] = useState(false);
  const [bulkCanjeForm, setBulkCanjeForm] = useState({
    quienRetira: '',
    parentesco: '',
    quienOtro: '',
    celular: ''
  });
  
  // Estado para modal de información de canje
  const [showCanjeInfoModal, setShowCanjeInfoModal] = useState(false);
  const [selectedCanjeInfo, setSelectedCanjeInfo] = useState(null);
  
  // Estados para tiempo real
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [updateIndicator, setUpdateIndicator] = useState(false);
  const socketConnectedRef = useRef(false);
  
  // Estados para detectar interacción del usuario
  const [userInteracting, setUserInteracting] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [lastUserAction, setLastUserAction] = useState(null);
  
  // Estado para colección activa
  const [activeCollection, setActiveCollection] = useState(null);

  // Determinar si el usuario es jefe
  const isJefe = user?.role === 'jefe' || user?.rol === 'jefe';
  
  // Función para actualizar un ticket individual en el estado
  const updateTicketInState = useCallback((updatedTicket) => {
    setTickets(prevTickets => {
      const ticketIndex = prevTickets.findIndex(t => t['Ticket ID'] === updatedTicket['Ticket ID']);
      
      if (ticketIndex !== -1) {
        // Actualizar ticket existente
        const newTickets = [...prevTickets];
        newTickets[ticketIndex] = { ...newTickets[ticketIndex], ...updatedTicket };
        return newTickets;
      }
      
      // Si no existe, agregarlo (solo si aplican los filtros actuales)
      return [...prevTickets, updatedTicket];
    });
    
    // Mostrar indicador de actualización brevemente
    setUpdateIndicator(true);
    setTimeout(() => setUpdateIndicator(false), 1000);
    setLastUpdateTime(new Date());
  }, []);
  
  // Función para actualizar datos en tiempo real (fallback si se necesita recarga completa)
  const refreshTicketsData = useCallback(async (showIndicator = false) => {
    // Solo mostrar indicador si se solicita explícitamente
    if (showIndicator) {
      setUpdateIndicator(true);
    }
    
    try {
      if (isJefe) {
        if (selectedPuntoVenta) {
          await fetchTicketsByPuntoVenta(true); // true = silencioso
        } else {
          await fetchAllTickets(true); // true = silencioso - cargar todos
        }
      } else if (!isJefe) {
        await fetchTicketsForStaff(true); // true = silencioso
      }
      
      setLastUpdateTime(new Date());
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error en actualización automática:', error);
      // No cambiar status a error en actualizaciones silenciosas
      // Solo en actualizaciones manuales
      if (showIndicator) {
        setConnectionStatus('error');
      }
    } finally {
      if (showIndicator) {
        setTimeout(() => setUpdateIndicator(false), 1000);
      }
    }
  }, [isJefe, selectedPuntoVenta]);
  
  // Configurar Socket.IO para actualizaciones en tiempo real
  useEffect(() => {
    if (!token || !isRealTimeActive) {
      return;
    }

    console.log('🔌 Configurando Socket.IO...');
    
    // Conectar al servidor de WebSocket
    socketService.connect(token);

    // Configurar listener para conexión exitosa
    socketService.on('connect', () => {
      console.log('✅ Socket.IO conectado');
      setConnectionStatus('connected');
      socketConnectedRef.current = true;
      
      // Unirse a la sala apropiada según el rol del usuario
      if (isJefe && selectedPuntoVenta) {
        socketService.joinPuntoVenta(selectedPuntoVenta);
      } else if (!isJefe && user?.puntoTrabajo) {
        socketService.joinStaff(user.puntoTrabajo);
      }
    });

    // Configurar listener para desconexión
    socketService.on('disconnect', (reason) => {
      console.log('❌ Socket.IO desconectado:', reason);
      setConnectionStatus('disconnected');
      socketConnectedRef.current = false;
    });

    // Configurar listener para actualizaciones de tickets
    socketService.on('ticket-updated', (data) => {
      console.log('📨 Actualización de ticket recibida:', data);
      
      // Solo actualizar si no hay búsqueda activa y el usuario no está interactuando
      const hasActiveFilters = search.trim() !== '' || seatSearch.trim() !== '' || ticketIdSearch.trim() !== '';
      const timeSinceLastAction = lastUserAction ? Date.now() - lastUserAction : Infinity;
      
      if (!hasActiveFilters && !userInteracting && timeSinceLastAction > 2000) {
        updateTicketInState(data.ticket);
      } else {
        console.log('⏸️ Actualización pausada (usuario interactuando o filtrando)');
      }
    });

    // Cleanup al desmontar
    return () => {
      console.log('🔌 Limpiando Socket.IO...');
      socketService.removeAllListeners('ticket-updated');
      socketService.disconnect();
      socketConnectedRef.current = false;
    };
  }, [token, isRealTimeActive, isJefe, selectedPuntoVenta, user?.puntoTrabajo, search, seatSearch, userInteracting, lastUserAction, updateTicketInState]);
  
  // Reconectar y unirse a nueva sala cuando cambia el punto de venta
  useEffect(() => {
    if (socketConnectedRef.current && isJefe && selectedPuntoVenta) {
      console.log('🔄 Cambiando a sala de punto de venta:', selectedPuntoVenta);
      socketService.joinPuntoVenta(selectedPuntoVenta);
    }
  }, [isJefe, selectedPuntoVenta]);
  
  // Detectar cambios de visibilidad de la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isRealTimeActive) {
        // Cuando la pestaña vuelve a estar visible, actualizar inmediatamente
        refreshTicketsData(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshTicketsData, isRealTimeActive]);
  
  // Función para manejar ordenamiento
  const handleSort = (field) => {
    setUserInteracting(true);
    setLastUserAction(Date.now());
    
    if (sortBy === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Si es un campo nuevo, empezar con ascendente
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Desmarcar interacción después del ordenamiento
    setTimeout(() => {
      setUserInteracting(false);
    }, 1000);
  };

  // Función para obtener el ícono de ordenamiento
  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <i className="fas fa-sort text-muted"></i>;
    }
    return sortOrder === 'asc' 
      ? <i className="fas fa-sort-up text-primary"></i>
      : <i className="fas fa-sort-down text-primary"></i>;
  };
  
  // Solo jefes pueden seleccionar puntos de venta
  useEffect(() => {
    if (isJefe) {
      fetchPuntosVenta();
    }
  }, [isJefe]);

  // Cargar tickets cuando cambia la selección, búsqueda u ordenamiento
  useEffect(() => {
    // No limpiar tickets innecesariamente - solo cargar cuando sea necesario
    if (isJefe) {
      // Si el jefe selecciona un punto de venta específico, cargar esos tickets
      if (selectedPuntoVenta) {
        fetchTicketsByPuntoVenta();
      } else {
        // Si el jefe NO selecciona punto de venta, cargar TODOS los tickets
        fetchAllTickets();
      }
    } else if (!isJefe && user?.puntoTrabajo) {
      // Staff carga sus tickets
      fetchTicketsForStaff();
    }
    // Removido el else que limpiaba los tickets - esto causaba la desconexión aparente
  }, [selectedPuntoVenta, pagination.page, sortBy, sortOrder]);

  // Búsqueda con debounce mejorado
  useEffect(() => {
    // Marcar que el usuario está interactuando
    setUserInteracting(true);
    setLastUserAction(Date.now());
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      if (isJefe) {
        if (selectedPuntoVenta) {
          fetchTicketsByPuntoVenta(false); // false = sin loading
        } else {
          fetchAllTickets(false); // false = sin loading - cargar todos
        }
      } else if (!isJefe) {
        fetchTicketsForStaff(false); // false = sin loading
      }
      
      // Desmarcar interacción después de completar la búsqueda
      setTimeout(() => {
        setUserInteracting(false);
      }, 1000);
    }, 800); // Aumentar debounce a 800ms para menos interrupciones

    setSearchTimeout(timeout);

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [search, seatSearch, ticketIdSearch]);

  // Obtener colección activa
  useEffect(() => {
    // COMENTADO: Función removida - no se usa en versión actual
    // const fetchActiveCollection = async () => {
    //   try {
    //     const response = await ticketService.getActiveCollection();
    //     if (response.success) {
    //       setActiveCollection(response.data);
    //     }
    //   } catch (error) {
    //     console.error('Error obteniendo colección activa:', error);
    //   }
    // };
    // fetchActiveCollection();
    // const interval = setInterval(fetchActiveCollection, 5 * 60 * 1000);
    // return () => clearInterval(interval);
  }, []);

  const fetchPuntosVenta = async () => {
    try {
      const response = await api.get('/puntos-venta');
      if (response.data.success) {
        setPuntosVenta(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching puntos de venta:', error);
      setError('Error al cargar puntos de venta');
    }
  };

  const fetchTicketsByPuntoVenta = async (silent = false) => {
    if (!selectedPuntoVenta) return;

    try {
      // Solo mostrar loading en actualizaciones manuales
      if (!silent) {
        setLoading(true);
      }
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search.trim() && { search: search.trim() }),
        ...(seatSearch.trim() && { seatSearch: seatSearch.trim() }),
        ...(ticketIdSearch.trim() && { ticketIdSearch: ticketIdSearch.trim() }),
        ...(sortBy && { sortBy }),
        ...(sortBy && { sortOrder })
      };

      const response = await api.get(`/puntos-venta/${selectedPuntoVenta}/tickets`, { params });

      if (response.data.success) {
        // Actualización inteligente: solo cambiar datos que realmente cambiaron
        const newTickets = response.data.data.tickets || [];
        const newPagination = {
          ...pagination,
          total: response.data.data.pagination.totalItems || 0,
          pages: response.data.data.pagination.totalPages || 0
        };
        
        // Comparar ticket por ticket para actualizaciones granulares
        let hasChanges = false;
        if (tickets.length !== newTickets.length) {
          hasChanges = true;
        } else {
          for (let i = 0; i < tickets.length; i++) {
            const oldTicket = tickets[i];
            const newTicket = newTickets[i];
            
            // Comparar campos críticos que pueden cambiar
            if (oldTicket['Ticket ID'] !== newTicket['Ticket ID'] ||
                oldTicket.canjeado !== newTicket.canjeado ||
                oldTicket.impreso !== newTicket.impreso ||
                oldTicket.quienRetira !== newTicket.quienRetira ||
                oldTicket.fechaCanje !== newTicket.fechaCanje) {
              hasChanges = true;
              break;
            }
          }
        }
        
        // Solo actualizar si detectamos cambios reales
        if (hasChanges) {
          setTickets(newTickets);
        }
        
        // Actualizar paginación solo si cambió
        if (pagination.total !== newPagination.total || pagination.pages !== newPagination.pages) {
          setPagination(newPagination);
        }
      } else {
        // Error en la respuesta - NO limpiar los tickets existentes
        console.warn('Error en respuesta del servidor:', response.data.message);
        if (!silent) {
          setError(response.data.message || 'Error al cargar tickets');
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      
      // Solo mostrar error si no es silencioso
      if (!silent) {
        setConnectionStatus('error');
        setError(error.response?.data?.message || 'Error al cargar los tickets');
      }
      // NO limpiar los tickets en caso de error - mantener los datos actuales
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Nueva función para obtener TODOS los tickets (sin filtro de punto de venta)
  const fetchAllTickets = async (silent = false) => {
    try {
      // Solo mostrar loading en actualizaciones manuales
      if (!silent) {
        setLoading(true);
      }
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search.trim() && { search: search.trim() }),
        ...(seatSearch.trim() && { seatSearch: seatSearch.trim() }),
        ...(ticketIdSearch.trim() && { ticketIdSearch: ticketIdSearch.trim() }),
        ...(sortBy && { sortBy }),
        ...(sortBy && { sortOrder })
      };

      const response = await api.get('/tickets', { params });

      if (response.data.success) {
        // Actualización inteligente: solo cambiar datos que realmente cambiaron
        const newTickets = response.data.data.tickets || [];
        const newPagination = {
          ...pagination,
          total: response.data.data.pagination.totalItems || newTickets.length || 0,
          pages: response.data.data.pagination.totalPages || 1
        };
        
        // Comparar ticket por ticket para actualizaciones granulares
        let hasChanges = false;
        if (tickets.length !== newTickets.length) {
          hasChanges = true;
        } else {
          for (let i = 0; i < tickets.length; i++) {
            const oldTicket = tickets[i];
            const newTicket = newTickets[i];
            
            // Comparar campos críticos que pueden cambiar
            if (oldTicket['Ticket ID'] !== newTicket['Ticket ID'] ||
                oldTicket.canjeado !== newTicket.canjeado ||
                oldTicket.impreso !== newTicket.impreso ||
                oldTicket.quienRetira !== newTicket.quienRetira ||
                oldTicket.fechaCanje !== newTicket.fechaCanje) {
              hasChanges = true;
              break;
            }
          }
        }
        
        // Solo actualizar si detectamos cambios reales
        if (hasChanges) {
          setTickets(newTickets);
        }
        
        // Actualizar paginación solo si cambió
        if (pagination.total !== newPagination.total || pagination.pages !== newPagination.pages) {
          setPagination(newPagination);
        }
      } else {
        // Error en la respuesta
        console.warn('Error en respuesta del servidor:', response.data.message);
        if (!silent) {
          setError(response.data.message || 'Error al cargar tickets');
        }
      }
    } catch (error) {
      console.error('Error fetching all tickets:', error);
      
      // Solo mostrar error si no es silencioso
      if (!silent) {
        setConnectionStatus('error');
        setError(error.response?.data?.message || 'Error al cargar los tickets');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchTicketsForStaff = async (silent = false) => {
    try {
      // Solo mostrar loading en actualizaciones manuales
      if (!silent) {
        setLoading(true);
      }
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(search.trim() && { search: search.trim() }),
        ...(seatSearch.trim() && { seatSearch: seatSearch.trim() }),
        ...(ticketIdSearch.trim() && { ticketIdSearch: ticketIdSearch.trim() }),
        ...(sortBy && { sortBy }),
        ...(sortBy && { sortOrder })
      };

      const response = await api.get('/puntos-venta/staff/tickets', { params });

      if (response.data.success) {
        // Actualización inteligente: solo cambiar datos que realmente cambiaron
        const newTickets = response.data.data.tickets || [];
        const newPagination = {
          ...pagination,
          total: response.data.data.pagination.totalItems || 0,
          pages: response.data.data.pagination.totalPages || 0
        };
        
        // Comparar ticket por ticket para actualizaciones granulares
        let hasChanges = false;
        if (tickets.length !== newTickets.length) {
          hasChanges = true;
        } else {
          for (let i = 0; i < tickets.length; i++) {
            const oldTicket = tickets[i];
            const newTicket = newTickets[i];
            
            // Comparar campos críticos que pueden cambiar
            if (oldTicket['Ticket ID'] !== newTicket['Ticket ID'] ||
                oldTicket.canjeado !== newTicket.canjeado ||
                oldTicket.impreso !== newTicket.impreso ||
                oldTicket.quienRetira !== newTicket.quienRetira ||
                oldTicket.fechaCanje !== newTicket.fechaCanje) {
              hasChanges = true;
              break;
            }
          }
        }
        
        // Solo actualizar si detectamos cambios reales
        if (hasChanges) {
          setTickets(newTickets);
        }
        
        // Actualizar paginación solo si cambió
        if (pagination.total !== newPagination.total || pagination.pages !== newPagination.pages) {
          setPagination(newPagination);
        }
      } else {
        // Error en la respuesta - NO limpiar los tickets existentes
        console.warn('Error en respuesta del servidor:', response.data.message);
        if (!silent) {
          setError(response.data.message || 'Error al cargar tickets');
        }
      }
    } catch (error) {
      console.error('Error fetching tickets for staff:', error);
      
      // Solo mostrar error si no es silencioso
      if (!silent) {
        setConnectionStatus('error');
        setError(error.response?.data?.message || 'Error al cargar los tickets');
      }
      // NO limpiar los tickets en caso de error - mantener los datos actuales
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handlePrint = (ticket) => {
    // Abrir modal para realizar canje
    setSelectedTicket(ticket);
    setShowPrintModal(true);
  };

  const handleSendToPrint = async (ticket) => {
    // Función mantenida para compatibilidad - ahora abre modal de canje
    setSelectedTicket(ticket);
    setShowPrintModal(true);
  };

  const handlePrintSubmit = async (e) => {
    e.preventDefault();
    
    const userRole = user?.role || user?.rol;
    
    // Validaciones del frontend
    if (!printForm.quienRetira) {
      alert('Debe seleccionar quién retira el ticket');
      return;
    }
    
    if (!printForm.celular) {
      alert('El número de celular es obligatorio');
      return;
    }

    if (!isValidPhone(printForm.celular)) {
      alert('El celular debe contener solo números (7 a 15 dígitos)');
      return;
    }

    if (printForm.quienRetira === 'Otro') {
      if (!printForm.parentesco) {
        alert('Debe seleccionar el parentesco cuando selecciona "Otro"');
        return;
      }
      if (!printForm.quienOtro) {
        alert('Debe especificar el nombre de quien retira cuando selecciona "Otro"');
        return;
      }
      if (!isValidName(printForm.quienOtro)) {
        alert('El nombre de quien retira solo debe contener letras');
        return;
      }
    }
    
    try {
      console.log('Iniciando proceso de canje...');
      console.log('Datos del formulario:', printForm);
      console.log('Ticket seleccionado:', selectedTicket);
      
      if (userRole === 'staff' || userRole === 'jefe') {
        // Preparar datos del canje
        const canjeData = {
          quienRetira: printForm.quienRetira,
          celular: printForm.celular
        };
        
        // Solo agregar campos adicionales si es "Otro"
        if (printForm.quienRetira === 'Otro') {
          canjeData.parentesco = printForm.parentesco;
          canjeData.quienOtro = printForm.quienOtro;
        }
        
        console.log('Enviando datos de canje:', canjeData);
        console.log('URL del endpoint:', `/tickets/${selectedTicket['Ticket ID']}/canje`);
        
        const response = await api.post(`/tickets/${selectedTicket['Ticket ID']}/canje`, canjeData);
        
        console.log('Respuesta del servidor:', response.data);
        alert('Canje realizado exitosamente');
        
        // Invalidar cache para forzar actualización
        if (api.invalidateCache) {
          api.invalidateCache('tickets');
          api.invalidateCache('puntos-venta');
        }
      }
      
      setShowPrintModal(false);
      setPrintForm({ quienRetira: '', parentesco: '', quienOtro: '', celular: '' });
      
      // Actualización suave inmediata (silenciosa)
      await refreshTicketsData(false);
      
      // Verificación adicional silenciosa después de 2 segundos
      setTimeout(() => {
        refreshTicketsData(false);
      }, 2000);
    } catch (error) {
      console.error('Error en proceso de canje:', error);
      console.error('Detalles del error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // Mostrar mensaje de error más específico
      let errorMessage = 'Error en el proceso de canje';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 500) {
        errorMessage = 'Error interno del servidor. Por favor, revise los logs del backend.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Ticket no encontrado';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Datos inválidos';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Error de conexión con el servidor';
      }
      
      alert(errorMessage);
    }
  };

  const handleReprint = async (ticket, motivo) => {
    try {
      await api.post(`/tickets/${ticket['Ticket ID']}/reprint`, { motivo });
      alert('Ticket reimpreso exitosamente');
      // Refrescar tickets
      if (isJefe) {
        if (selectedPuntoVenta) {
          fetchTicketsByPuntoVenta();
        } else {
          fetchAllTickets(); // Cargar todos los tickets
        }
      } else if (!isJefe) {
        fetchTicketsForStaff();
      }
    } catch (error) {
      console.error('Error reprinting ticket:', error);
      alert(error.response?.data?.message || 'Error al reimprimir ticket');
    }
  };

  const canPrint = (ticket) => {
    const userRole = user?.role || user?.rol;
    
    // Si el ticket ya fue canjeado, no se puede hacer nada más
    if (ticket.canjeado) return false;
    
    // Jefes pueden imprimir directamente sin restricciones (solo si no está canjeado)
    if (userRole === 'jefe') return true;
    
    // Para staff, verificar si ya hay una petición para esta transacción
    if (userRole === 'staff') {
      // Si el ticket ya está impreso, no pueden solicitar más impresión
      if (ticket.impreso) return false;
      
      // Verificar si ya hay una petición pendiente para esta transacción
      const existingRequest = printRequests.find(req => 
        req.transactionId === ticket['Transaction ID'] && 
        (req.estado === 'pendiente' || req.estado === 'completada')
      );
      
      // Solo puede imprimir si no hay petición existente
      return !existingRequest;
    }
    
    // Impresores pueden reimprimir tickets ya impresos (solo si no están canjeados)
    if (userRole === 'impresor' && ticket.impreso) return true;
    
    return false;
  };

  // Funciones para selección múltiple (solo admin/jefe)
  const handleSelectTicket = (ticketId) => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTickets.size === tickets.filter(t => !t.canjeado).length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedTickets(new Set());
    } else {
      // Seleccionar todos los tickets no canjeados
      const allTicketIds = tickets
        .filter(t => !t.canjeado)
        .map(t => t['Ticket ID']);
      setSelectedTickets(new Set(allTicketIds));
    }
  };

  const handleBulkCanje = () => {
    if (selectedTickets.size === 0) {
      alert('Debe seleccionar al menos un ticket');
      return;
    }
    setShowBulkCanjeModal(true);
  };

  const handleBulkCanjeSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!bulkCanjeForm.quienRetira) {
      alert('Debe seleccionar quién retira los tickets');
      return;
    }
    
    if (!bulkCanjeForm.celular) {
      alert('El número de celular es obligatorio');
      return;
    }

    if (!isValidPhone(bulkCanjeForm.celular)) {
      alert('El celular debe contener solo números (7 a 15 dígitos)');
      return;
    }

    if (bulkCanjeForm.quienRetira === 'Otro') {
      if (!bulkCanjeForm.parentesco) {
        alert('Debe seleccionar el parentesco cuando selecciona "Otro"');
        return;
      }
      if (!bulkCanjeForm.quienOtro) {
        alert('Debe especificar el nombre de quien retira cuando selecciona "Otro"');
        return;
      }
      if (!isValidName(bulkCanjeForm.quienOtro)) {
        alert('El nombre de quien retira solo debe contener letras');
        return;
      }
    }

    try {
      const canjeData = {
        quienRetira: bulkCanjeForm.quienRetira,
        celular: bulkCanjeForm.celular
      };
      
      if (bulkCanjeForm.quienRetira === 'Otro') {
        canjeData.parentesco = bulkCanjeForm.parentesco;
        canjeData.quienOtro = bulkCanjeForm.quienOtro;
      }

      // Usar endpoint optimizado de canje masivo
      const response = await api.post('/tickets/bulk-canje', {
        ticketIds: Array.from(selectedTickets),
        canjeData
      });

      if (response.data.success) {
        const { updated, alreadyRedeemed } = response.data.data;
        let message = `${updated} tickets canjeados exitosamente`;
        if (alreadyRedeemed > 0) {
          message += `\n(${alreadyRedeemed} ya estaban canjeados)`;
        }
        alert(message);
        
        // Limpiar selección y cerrar modal
        setSelectedTickets(new Set());
        setShowBulkCanjeModal(false);
        setBulkCanjeForm({ quienRetira: '', parentesco: '', quienOtro: '', celular: '' });
        
        // Actualizar tickets SIN resetear filtros
        await refreshTicketsData(true);
      }
    } catch (error) {
      console.error('Error en canje masivo:', error);
      const errorMsg = error.response?.data?.message || 'Error al canjear tickets';
      alert(errorMsg);
    }
  };

  const getPrintButtonText = (ticket) => {
    const userRole = user?.role || user?.rol;
    
    // Si ya está canjeado, mostrar estado canjeado
    if (ticket.canjeado) {
      return 'Canjeado';
    }
    
    if (userRole === 'jefe') {
      // Jefe puede realizar canje directamente siempre (si no está canjeado)
      return ticket.impreso ? 'Reimprimir' : 'Realizar Canje';
    }
    
    if (userRole === 'staff') {
      // Verificar si ya hay una petición para esta transacción
      const existingRequest = printRequests.find(req => 
        req.transactionId === ticket['Transaction ID']
      );
      
      if (existingRequest) {
        switch (existingRequest.estado) {
          case 'pendiente':
            return 'Canje Pendiente';
          case 'completada':
            return 'Ya Canjeado';
          case 'cancelada':
            return 'Canje Cancelado';
          default:
            return 'En Proceso';
        }
      }
      
      return ticket.impreso ? 'Ya Impreso' : 'Realizar Canje';
    }
    
    if (userRole === 'impresor') {
      return 'Reimprimir';
    }
    
    return ticket.impreso ? 'Reimprimir' : 'Imprimir';
  };

  const handleRefresh = () => {
    // Actualización manual con indicador visible
    refreshTicketsData(true);
  };

  // Función para actualización manual completa (con loading)
  const handleManualRefresh = async () => {
    try {
      if (isJefe) {
        if (selectedPuntoVenta) {
          await fetchTicketsByPuntoVenta(false); // false = mostrar loading
        } else {
          await fetchAllTickets(false); // false = mostrar loading
        }
      } else if (!isJefe) {
        await fetchTicketsForStaff(false); // false = mostrar loading
      }
    } catch (error) {
      console.error('Error en actualización manual:', error);
    }
  };

  // Función para obtener el estado de impresión de un ticket
  const getTicketPrintStatus = (ticket) => {
    if (user?.rol === 'staff' || user?.role === 'staff' || user?.rol === 'jefe' || user?.role === 'jefe') {
      // Buscar por transaction ID en lugar de ticket ID individual
      const request = printRequests.find(req => req.transactionId === ticket['Transaction ID']);
      console.log('Buscando transacción:', ticket['Transaction ID']);
      console.log('Peticiones disponibles:', printRequests.map(r => ({ transactionId: r.transactionId, estado: r.estado })));
      console.log('Petición encontrada para transacción:', request);
      
      if (request) {
        switch (request.estado) {
          case 'pendiente':
            return 'pending'; // Amarillo
          case 'completada':
          case 'completado':
            return 'completed'; // Verde
          case 'cancelada':
          case 'cancelado':
            return 'cancelled'; // Rojo
          default:
            return 'normal';
        }
      }
    }
    return ticket.impreso ? 'printed' : 'normal';
  };

  // Función para obtener las clases CSS según el estado
  const getRowClasses = (ticket) => {
    // Prioridad: canjeado > otros estados
    if (ticket.canjeado) {
      return 'table-success'; // Verde para canjeados
    }
    
    const status = getTicketPrintStatus(ticket);
    
    switch (status) {
      case 'pending':
        return 'table-warning'; // Amarillo
      case 'completed':
      case 'printed':
        return 'table-info'; // Azul claro para impresos pero no canjeados
      case 'cancelled':
        return 'table-danger'; // Rojo
      default:
        return '';
    }
  };

  // Función para obtener información de impresión de un ticket
  const getTicketPrintInfo = (ticket) => {
    // Prioridad: mostrar información de canje si existe
    if (ticket.canjeado) {
      const retiraInfo = ticket.quienRetira === 'Otro' && ticket.quienOtro ? 
        `${ticket.quienRetira} (${ticket.parentesco || 'N/A'}: ${ticket.quienOtro})` : 
        ticket.quienRetira || 'N/A';
      
      return {
        estado: 'Canjeado',
        fecha: ticket.fechaCanje ? new Date(ticket.fechaCanje).toLocaleString('es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) : 'N/A',
        responsable: ticket.usuarioResponsable?.nombre || ticket.usuarioResponsable?.usuario || 'N/A',
        quienRetira: retiraInfo,
        celular: ticket.celular || 'N/A'
      };
    }
    
    if (ticket.impreso) {
      const retiraInfo = ticket.quienRetira === 'Otro' && ticket.quienOtro ? 
        `${ticket.quienRetira} (${ticket.parentesco || 'N/A'}: ${ticket.quienOtro})` : 
        ticket.quienRetira || 'N/A';
      
      return {
        estado: 'Impreso',
        fecha: ticket.fechaImpresion ? new Date(ticket.fechaImpresion).toLocaleString('es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A',
        responsable: ticket.usuarioResponsable?.nombre || ticket.usuarioResponsable?.usuario || 'N/A',
        quienRetira: retiraInfo,
        celular: ticket.celular || 'N/A'
      };
    }
    
    if (user?.rol === 'staff' || user?.role === 'staff' || user?.rol === 'jefe' || user?.role === 'jefe') {
      // Buscar por transaction ID en lugar de ticket ID individual
      const request = printRequests.find(req => req.transactionId === ticket['Transaction ID']);
      if (request) {
        const retiraInfo = request.quienRetira === 'Otro' && request.quienOtro ? 
          `${request.quienRetira} (${request.parentesco || 'N/A'}: ${request.quienOtro})` : 
          request.quienRetira || 'N/A';
        
        return {
          estado: request.estado === 'completada' ? 'Completado' : 
                 request.estado === 'pendiente' ? 'Pendiente' :
                 request.estado === 'cancelada' ? 'Cancelado' : 'En proceso',
          fecha: request.fechaProcesado ? new Date(request.fechaProcesado).toLocaleDateString() : 'N/A',
          responsable: request.nombreSolicitante || 'N/A',
          quienRetira: retiraInfo,
          celular: request.celular || 'N/A'
        };
      }
    }
    
    return null;
  };

  // Función para cargar peticiones de impresión (para staff y jefe)
  // COMENTADO: Función removida - servicio de impresión no está disponible
  // const fetchPrintRequests = async () => {
  //   if (user?.rol !== 'staff' && user?.role !== 'staff' && user?.rol !== 'jefe' && user?.role !== 'jefe') return;
  //   
  //   try {
  //     const response = await impresionService.getMyRequests();
  //     if (response.success) {
  //       setPrintRequests(response.data.peticiones || []);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching print requests:', error);
  //   }
  // };

  // Cargar peticiones de impresión para staff y jefe
  useEffect(() => {
    // COMENTADO: fetchPrintRequests no está disponible
    // if (user?.rol === 'staff' || user?.role === 'staff' || user?.rol === 'jefe' || user?.role === 'jefe') {
    //   fetchPrintRequests();
    //   const interval = setInterval(fetchPrintRequests, 30000);
    //   return () => clearInterval(interval);
    // }
  }, [user, tickets]);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>
                Gestión de Tickets 
                {!isJefe && (
                  <small className="text-muted ms-2">
                    - Punto de trabajo: {user?.puntoTrabajo || 'No asignado'}
                  </small>
                )}
              </h2>
              {activeCollection && (
                <div className="mt-2">
                  {/* Si hay múltiples colecciones disponibles */}
                  {activeCollection.multiple && activeCollection.all && activeCollection.all.length > 1 ? (
                    <div className="d-flex flex-wrap gap-1">
                      <span className="badge bg-secondary" style={{ fontSize: '0.85em' }}>
                        📅 Colecciones Disponibles:
                      </span>
                      {activeCollection.all.map((col, idx) => (
                        <span 
                          key={idx}
                          className="badge" 
                          style={{ 
                            backgroundColor: col === 'FechaUno' ? '#007bff' :
                                          col === 'FechaDos' ? '#28a745' :
                                          col === 'FechaTres' ? '#ffc107' : '#6c757d',
                            fontSize: '0.85em',
                            opacity: col === activeCollection.current ? 1 : 0.7
                          }}
                          title={col === activeCollection.current ? 'Colección en uso' : 'También disponible hoy'}
                        >
                          {col === 'FechaUno' && '🎵 Fecha 1'}
                          {col === 'FechaDos' && '🎸 Fecha 2'}
                          {col === 'FechaTres' && '🎤 Fecha 3'}
                          {col === activeCollection.current && ' ✓'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    /* Una sola colección activa */
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: activeCollection.active === 'FechaUno' ? '#007bff' :
                                        activeCollection.active === 'FechaDos' ? '#28a745' :
                                        activeCollection.active === 'FechaTres' ? '#ffc107' : '#6c757d',
                        fontSize: '0.9em'
                      }}
                    >
                      📅 Colección Activa: {activeCollection.active}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="d-flex align-items-center gap-2">
              {/* Botón de actualización manual */}
              <button
                className="btn btn-outline-primary btn-sm"
                onClick={handleRefresh}
                disabled={loading || updateIndicator}
                style={{fontSize: '0.8em'}}
              >
                <i className={`fas fa-sync ${updateIndicator ? 'fa-spin' : ''}`}></i>{' '}
                Actualizar
              </button>

              {/* Botón de canje masivo (para jefe y staff) */}
              {selectedTickets.size > 0 && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleBulkCanje}
                  style={{fontSize: '0.8em'}}
                >
                  <i className="fas fa-check-double me-1"></i>
                  Canjear Seleccionados ({selectedTickets.size})
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError('')}
              ></button>
            </div>
          )}

          {/* Solo mostrar selector de punto de venta para jefes */}
          {isJefe && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Filtrar por Punto de Venta (Opcional)</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">
                      Punto de Venta
                      <small className="text-muted ms-2">(opcional - dejar vacío para ver todos)</small>
                    </label>
                    <select
                      className="form-select"
                      value={selectedPuntoVenta}
                      onChange={(e) => {
                        setUserInteracting(true);
                        setLastUserAction(Date.now());
                        setSelectedPuntoVenta(e.target.value);
                        setPagination(prev => ({ ...prev, page: 1 }));
                        setTimeout(() => setUserInteracting(false), 2000);
                      }}
                      onFocus={() => {
                        setUserInteracting(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setUserInteracting(false), 1000);
                      }}
                    >
                      <option value="">📍 Todas las localidades</option>
                      {puntosVenta.map(punto => (
                        <option key={punto._id} value={punto._id}>
                          {punto.nombre} ({punto.localidades.join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Barra de búsqueda */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Búsqueda</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">
                    Búsqueda general 
                    <small className="text-muted">
                      (nombre, email, cédula, ticket ID, transaction ID)
                    </small>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ejemplo: Juan Pérez, juan@email.com..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setLastUserAction(Date.now());
                    }}
                    onFocus={() => {
                      setSearchInputFocused(true);
                      setUserInteracting(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setSearchInputFocused(false);
                        setUserInteracting(false);
                      }, 2000); // Esperar 2 segundos después de perder el foco
                    }}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">
                    Búsqueda por asiento 
                    <small className="text-muted">
                      (específico para asientos)
                    </small>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ejemplo: A, A 10, A 10 12..."
                    value={seatSearch}
                    onChange={(e) => {
                      setSeatSearch(e.target.value);
                      setLastUserAction(Date.now());
                    }}
                    onFocus={() => {
                      setSearchInputFocused(true);
                      setUserInteracting(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setSearchInputFocused(false);
                        setUserInteracting(false);
                      }, 2000); // Esperar 2 segundos después de perder el foco
                    }}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">
                    Búsqueda por Ticket ID
                    <small className="text-muted">
                      (solo número de ticket)
                    </small>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ejemplo: 17237508..."
                    value={ticketIdSearch}
                    onChange={(e) => {
                      setTicketIdSearch(e.target.value);
                      setLastUserAction(Date.now());
                    }}
                    onFocus={() => {
                      setSearchInputFocused(true);
                      setUserInteracting(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setSearchInputFocused(false);
                        setUserInteracting(false);
                      }, 2000); // Esperar 2 segundos después de perder el foco
                    }}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setSearch('');
                      setSeatSearch('');
                      setTicketIdSearch('');
                      setSortBy('');
                      setSortOrder('asc');
                      setPagination(prev => ({ ...prev, page: 1 }));
                      setLastUserAction(Date.now());
                      setUserInteracting(true);
                      
                      // Desmarcar interacción después de limpiar
                      setTimeout(() => {
                        setUserInteracting(false);
                      }, 1000);
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-12">
                  <small className="text-muted">
                    <strong>Nota:</strong> Puedes usar ambos campos simultáneamente. 
                    El campo de asiento busca específicamente en los asientos (A, B, C, etc.) 
                    y no distingue entre mayúsculas y minúsculas.
                    {sortBy && (
                      <span className="ms-3">
                        <strong>Ordenando por:</strong> {sortBy} ({sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})
                      </span>
                    )}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Validaciones para mostrar contenido */}
          {isJefe && !selectedPuntoVenta ? (
            <div className="alert alert-info text-center">
              <h5>Seleccione un punto de venta</h5>
              <p>Debe seleccionar un punto de venta para ver los tickets correspondientes.</p>
              {puntosVenta.length === 0 && (
                <p>
                  <small>
                    <strong>Nota:</strong> No hay puntos de venta disponibles. 
                    Debe crearlos primero en la sección "Puntos de Venta".
                  </small>
                </p>
              )}
            </div>
          ) : !isJefe && !user?.puntoTrabajo ? (
            <div className="alert alert-warning text-center">
              <h5>Sin punto de trabajo asignado</h5>
              <p>Su usuario no tiene un punto de trabajo asignado. Contacte al administrador.</p>
            </div>
          ) : (
            /* Tabla de tickets */
            <div className="card">
              <div className="card-body">
                {loading ? (
                  <div className="d-flex justify-content-center p-4">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Cargando tickets...</span>
                    </div>
                    <span className="ms-3">Buscando tickets...</span>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="alert alert-warning text-center">
                    <h5>No se encontraron tickets</h5>
                    <p>
                      {search.trim() 
                        ? `No hay tickets que coincidan con "${search}"` 
                        : 'No hay tickets disponibles para mostrar'
                      }
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Información de resultados y leyenda de colores */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <span className="text-muted">
                          Mostrando {tickets.length} de {pagination.total} tickets
                          {search.trim() && ` (filtrados por "${search}")`}
                        </span>
                        <div className="mt-1">
                          <small className="me-3">
                            <span className="badge bg-success me-1">●</span>
                            Canjeados
                          </small>
                          <small className="me-3">
                            <span className="badge bg-info me-1">●</span>
                            Impresos
                          </small>
                          <small className="me-3">
                            <span className="badge bg-warning me-1">●</span>
                            Pendientes
                          </small>
                          <small className="me-3">
                            <span className="badge bg-danger me-1">●</span>
                            Cancelados
                          </small>
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <span className="badge bg-primary me-2">
                          Página {pagination.page} de {pagination.pages}
                        </span>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover table-sm">
                        <thead className="table-dark">
                          <tr>
                            <th style={{ width: '50px' }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                onChange={handleSelectAll}
                                checked={selectedTickets.size > 0 && selectedTickets.size === tickets.filter(t => !t.canjeado).length}
                                title="Seleccionar todos"
                              />
                            </th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th 
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleSort('Seat')}
                              title="Hacer clic para ordenar por asiento"
                            >
                              Asiento {getSortIcon('Seat')}
                            </th>
                            <th>Categoría</th>
                            <th>Número de Cédula</th>
                            <th 
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleSort('Ticket ID')}
                              title="Hacer clic para ordenar por Ticket ID"
                            >
                              Ticket ID {getSortIcon('Ticket ID')}
                            </th>
                            <th 
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                              onClick={() => handleSort('Transaction ID')}
                              title="Hacer clic para ordenar por Transaction ID"
                            >
                              Transaction ID {getSortIcon('Transaction ID')}
                            </th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map(ticket => {
                            const printInfo = getTicketPrintInfo(ticket);
                            return (
                              <tr 
                                key={ticket['Ticket ID']} 
                                className={getRowClasses(ticket)}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={selectedTickets.has(ticket['Ticket ID'])}
                                    onChange={() => handleSelectTicket(ticket['Ticket ID'])}
                                    disabled={ticket.canjeado}
                                  />
                                </td>
                                <td>
                                  <strong>{`${ticket['First Name']} ${ticket['Last Name']}`}</strong>
                                </td>
                                <td>
                                  <small>{ticket['Email']}</small>
                                </td>
                                <td>
                                  <span className="table-tag table-tag-seat">{ticket['Seat']}</span>
                                </td>
                                <td>
                                  <small>{ticket['Ticket']}</small>
                                </td>
                                <td>
                                  <small>{ticket['Número de Cédula: '] || ticket['Numero de Cedula:'] || '-'}</small>
                                </td>
                                <td>
                                  <code style={{fontSize: '0.8em'}}>{ticket['Ticket ID']}</code>
                                </td>
                                <td>
                                  <code style={{fontSize: '0.8em'}}>{ticket['Transaction ID']}</code>
                                </td>
                                <td>
                                  {ticket.canjeado ? (
                                    <button
                                      className="btn btn-success btn-sm"
                                      title="Click para ver detalles del canje"
                                      onClick={() => {
                                        setSelectedCanjeInfo(ticket);
                                        setShowCanjeInfoModal(true);
                                      }}
                                    >
                                      <i className="fas fa-check-circle"></i> {getPrintButtonText(ticket)}
                                    </button>
                                  ) : canPrint(ticket) ? (
                                    <>
                                      {!ticket.impreso ? (
                                        <button
                                          className="btn btn-primary btn-sm me-1"
                                          onClick={() => handlePrint(ticket)}
                                        >
                                          <i className="fas fa-print"></i> {getPrintButtonText(ticket)}
                                        </button>
                                      ) : (
                                        <button
                                          className="btn btn-warning btn-sm me-1"
                                          onClick={() => {
                                            const userRole = user?.role || user?.rol;
                                            
                                            if (userRole === 'staff') {
                                              // Staff usa el modal para reimpresiones también
                                              handleSendToPrint(ticket);
                                            } else {
                                              // Jefe/Impresor reimprimen directamente
                                              const motivo = prompt('Motivo de reimpresión:');
                                              if (motivo) {
                                                handleReprint(ticket, motivo);
                                              }
                                            }
                                          }}
                                        >
                                          <i className="fas fa-redo"></i> {getPrintButtonText(ticket)}
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-muted" style={{fontSize: '0.8em'}}>Sin acciones</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación mejorada */}
                    {pagination.pages > 1 && (
                      <nav className="mt-4">
                        <ul className="pagination justify-content-center">
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => {
                                setUserInteracting(true);
                                setLastUserAction(Date.now());
                                setPagination(prev => ({...prev, page: 1}));
                                setTimeout(() => setUserInteracting(false), 1000);
                              }}
                              disabled={pagination.page === 1}
                            >
                              Primera
                            </button>
                          </li>
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => {
                                setUserInteracting(true);
                                setLastUserAction(Date.now());
                                setPagination(prev => ({...prev, page: prev.page - 1}));
                                setTimeout(() => setUserInteracting(false), 1000);
                              }}
                              disabled={pagination.page === 1}
                            >
                              Anterior
                            </button>
                          </li>
                          
                          {/* Páginas numéricas */}
                          {(() => {
                            const start = Math.max(1, pagination.page - 2);
                            const end = Math.min(pagination.pages, pagination.page + 2);
                            const pages = [];
                            
                            for (let i = start; i <= end; i++) {
                              pages.push(
                                <li key={i} className={`page-item ${pagination.page === i ? 'active' : ''}`}>
                                  <button
                                    className="page-link"
                                    onClick={() => {
                                      setUserInteracting(true);
                                      setLastUserAction(Date.now());
                                      setPagination(prev => ({...prev, page: i}));
                                      setTimeout(() => setUserInteracting(false), 1000);
                                    }}
                                  >
                                    {i}
                                  </button>
                                </li>
                              );
                            }
                            return pages;
                          })()}
                          
                          <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => {
                                setUserInteracting(true);
                                setLastUserAction(Date.now());
                                setPagination(prev => ({...prev, page: prev.page + 1}));
                                setTimeout(() => setUserInteracting(false), 1000);
                              }}
                              disabled={pagination.page === pagination.pages}
                            >
                              Siguiente
                            </button>
                          </li>
                          <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => {
                                setUserInteracting(true);
                                setLastUserAction(Date.now());
                                setPagination(prev => ({...prev, page: pagination.pages}));
                                setTimeout(() => setUserInteracting(false), 1000);
                              }}
                              disabled={pagination.page === pagination.pages}
                            >
                              Última
                            </button>
                          </li>
                        </ul>
                        <div className="text-center text-muted mt-2">
                          <small>
                            Página {pagination.page} de {pagination.pages} | 
                            Total: {pagination.total} tickets | 
                            Mostrando hasta {pagination.limit} por página
                          </small>
                        </div>
                      </nav>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Modal de impresión */}
          {showPrintModal && (
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {(user?.role === 'staff' || user?.rol === 'staff') ? 'Realizar Canje' : 'Canje de Ticket'}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowPrintModal(false)}
                    ></button>
                  </div>
                  <form onSubmit={handlePrintSubmit}>
                    <div className="modal-body">
                      <div className="alert alert-info">
                        <strong>Ticket:</strong> {`${selectedTicket['First Name']} ${selectedTicket['Last Name']}`}<br />
                        <strong>Asiento:</strong> {selectedTicket['Seat']}<br />
                        <strong>Ticket ID:</strong> {selectedTicket['Ticket ID']}
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">¿Quién retira? *</label>
                        <select
                          className="form-select"
                          value={printForm.quienRetira}
                          onChange={(e) => {
                            // Limpiar campos relacionados cuando cambia la selección
                            setPrintForm({
                              ...printForm, 
                              quienRetira: e.target.value, 
                              parentesco: '', 
                              quienOtro: ''
                            });
                          }}
                        >
                          <option value="">Seleccione una opción</option>
                          <option value="Titular">Titular</option>
                          <option value="Titular Compra">Titular Compra</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      {/* Solo mostrar campos adicionales cuando se selecciona "Otro" */}
                      {printForm.quienRetira === 'Otro' && (
                        <>
                          <div className="mb-3">
                            <label className="form-label">Parentesco *</label>
                            <select
                              className="form-select"
                              value={printForm.parentesco}
                              onChange={(e) => setPrintForm({...printForm, parentesco: e.target.value})}
                            >
                              <option value="">Seleccione el parentesco</option>
                              <option value="Esposo/a">Esposo/a</option>
                              <option value="Hijo/a">Hijo/a</option>
                              <option value="Padre/Madre">Padre/Madre</option>
                              <option value="Hermano/a">Hermano/a</option>
                              <option value="Amigo/a">Amigo/a</option>
                              <option value="Otro parentesco">Otro</option>
                            </select>
                          </div>

                          <div className="mb-3">
                            <label className="form-label">Nombre completo de quien retira *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Nombre completo de quien retira"
                              value={printForm.quienOtro}
                              onChange={(e) => setPrintForm({...printForm, quienOtro: onlyLetters(e.target.value)})}
                            />
                          </div>
                        </>
                      )}

                      {/* Información adicional para casos de Titular */}
                      {(printForm.quienRetira === 'Titular' || printForm.quienRetira === 'Titular Compra') && (
                        <div className="alert alert-info">
                          <small>
                            <i className="fas fa-info-circle me-1"></i>
                            {printForm.quienRetira === 'Titular'
                              ? 'El titular del ticket retira personalmente'
                              : 'El titular de la compra retira personalmente'}
                          </small>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label">Celular *</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          className="form-control"
                          placeholder="Número de celular"
                          value={printForm.celular}
                          maxLength={15}
                          onChange={(e) => setPrintForm({...printForm, celular: onlyDigits(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowPrintModal(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {(user?.role === 'staff' || user?.rol === 'staff') ? 'Realizar Canje' : 'Canje'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Modal de canje masivo */}
          {showBulkCanjeModal && (
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header bg-success text-white">
                    <h5 className="modal-title">
                      <i className="fas fa-check-double me-2"></i>
                      Canje Masivo de Tickets
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={() => setShowBulkCanjeModal(false)}
                    ></button>
                  </div>
                  <form onSubmit={handleBulkCanjeSubmit}>
                    <div className="modal-body">
                      <div className="alert alert-warning">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>Atención:</strong> Está a punto de canjear <strong>{selectedTickets.size} tickets</strong> simultáneamente.
                        Todos recibirán la misma información de canje.
                      </div>

                      <div className="card mb-3">
                        <div className="card-header">
                          <strong>Tickets seleccionados:</strong>
                        </div>
                        <div className="card-body" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          <div className="row">
                            {tickets
                              .filter(t => selectedTickets.has(t['Ticket ID']))
                              .map(ticket => (
                                <div key={ticket['Ticket ID']} className="col-md-6 mb-2">
                                  <div className="border rounded p-2">
                                    <small>
                                      <strong>{ticket['First Name']} {ticket['Last Name']}</strong><br />
                                      Asiento: <span className="chip-seat"><i className="bi bi-person-square"></i>{ticket['Seat']}</span><br />
                                      Ticket: <code>{ticket['Ticket ID']}</code>
                                    </small>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">¿Quién retira? *</label>
                        <select
                          className="form-select"
                          value={bulkCanjeForm.quienRetira}
                          onChange={(e) => {
                            setBulkCanjeForm({
                              ...bulkCanjeForm, 
                              quienRetira: e.target.value, 
                              parentesco: '', 
                              quienOtro: ''
                            });
                          }}
                        >
                          <option value="">Seleccione una opción</option>
                          <option value="Titular">Titular</option>
                          <option value="Titular Compra">Titular Compra</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      {bulkCanjeForm.quienRetira === 'Otro' && (
                        <>
                          <div className="mb-3">
                            <label className="form-label">Parentesco *</label>
                            <select
                              className="form-select"
                              value={bulkCanjeForm.parentesco}
                              onChange={(e) => setBulkCanjeForm({...bulkCanjeForm, parentesco: e.target.value})}
                            >
                              <option value="">Seleccione el parentesco</option>
                              <option value="Esposo/a">Esposo/a</option>
                              <option value="Hijo/a">Hijo/a</option>
                              <option value="Padre/Madre">Padre/Madre</option>
                              <option value="Hermano/a">Hermano/a</option>
                              <option value="Amigo/a">Amigo/a</option>
                              <option value="Otro parentesco">Otro</option>
                            </select>
                          </div>

                          <div className="mb-3">
                            <label className="form-label">Nombre completo de quien retira *</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Nombre completo de quien retira"
                              value={bulkCanjeForm.quienOtro}
                              onChange={(e) => setBulkCanjeForm({...bulkCanjeForm, quienOtro: onlyLetters(e.target.value)})}
                            />
                          </div>
                        </>
                      )}

                      {(bulkCanjeForm.quienRetira === 'Titular' || bulkCanjeForm.quienRetira === 'Titular Compra') && (
                        <div className="alert alert-info">
                          <small>
                            <i className="fas fa-info-circle me-1"></i>
                            {bulkCanjeForm.quienRetira === 'Titular'
                              ? 'El titular de los tickets retira personalmente'
                              : 'El titular de la compra retira personalmente'}
                          </small>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label">Celular *</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          className="form-control"
                          placeholder="Número de celular"
                          value={bulkCanjeForm.celular}
                          maxLength={15}
                          onChange={(e) => setBulkCanjeForm({...bulkCanjeForm, celular: onlyDigits(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowBulkCanjeModal(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-success">
                        <i className="fas fa-check-double me-1"></i>
                        Canjear {selectedTickets.size} Tickets
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Modal de información del canje */}
          {showCanjeInfoModal && selectedCanjeInfo && (
            <div className="modal-backdrop fade show" style={{display: 'block'}}></div>
          )}
          {showCanjeInfoModal && selectedCanjeInfo && (
            <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="fas fa-check-circle text-success me-2"></i>
                      Información del Canje
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowCanjeInfoModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row mb-3">
                      <div className="col-6">
                        <strong>Nombre:</strong>
                        <p className="text-muted">{selectedCanjeInfo['First Name']} {selectedCanjeInfo['Last Name']}</p>
                      </div>
                      <div className="col-6">
                        <strong>Email:</strong>
                        <p className="text-muted">{selectedCanjeInfo['Email']}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-6">
                        <strong>Ticket ID:</strong>
                        <p><code>{selectedCanjeInfo['Ticket ID']}</code></p>
                      </div>
                      <div className="col-6">
                        <strong>Asiento:</strong>
                        <p><span className="chip-seat"><i className="bi bi-person-square"></i>{selectedCanjeInfo['Seat']}</span></p>
                      </div>
                    </div>
                    
                    <hr />
                    <h6 className="mb-3">
                      <i className="fas fa-clipboard-list text-primary me-2"></i>
                      Detalles del Canje
                    </h6>
                    
                    <div className="row mb-3">
                      <div className="col-12">
                        <strong>Fecha de Canje:</strong>
                        <p className="text-muted">
                          {selectedCanjeInfo.fechaCanje 
                            ? new Date(selectedCanjeInfo.fechaCanje).toLocaleString('es-EC', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                timeZone: 'America/Guayaquil'
                              })
                            : 'No disponible'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-12">
                        <strong>Punto de Venta/Canje:</strong>
                        <p className="text-muted">{selectedCanjeInfo.puntoCanje || selectedCanjeInfo.puntoTrabajo || 'No asignado'}</p>
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-12">
                        <strong>Usuario que Canjea:</strong>
                        <p className="text-muted">
                          {selectedCanjeInfo.usuarioResponsable?.nombre ||
                            selectedCanjeInfo.usuarioResponsable?.usuario ||
                            'Usuario desconocido'}
                        </p>
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-6">
                        <strong>Quién Retira:</strong>
                        <p className="text-muted">{selectedCanjeInfo.quienRetira || '-'}</p>
                      </div>
                      <div className="col-6">
                        <strong>Celular:</strong>
                        <p className="text-muted">{selectedCanjeInfo.celular || '-'}</p>
                      </div>
                    </div>

                    {selectedCanjeInfo.quienRetira === 'Otro' && (
                      <div className="row mb-3">
                        <div className="col-6">
                          <strong>Parentesco:</strong>
                          <p className="text-muted">{selectedCanjeInfo.parentesco || '-'}</p>
                        </div>
                        <div className="col-6">
                          <strong>Nombre (Otro):</strong>
                          <p className="text-muted">{selectedCanjeInfo.quienOtro || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCanjeInfoModal(false)}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
