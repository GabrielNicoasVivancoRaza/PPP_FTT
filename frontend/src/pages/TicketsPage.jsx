import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import socketService from '../services/socket';
import { printerSettingsService, ticketService } from '../services';
import { useScanSession } from '../context/ScanSessionContext';
import { getCedula, getLast4 } from '../utils/ticketFields';
import { onlyDigits, onlyLetters, onlyAlphanumeric, isValidPhone, isValidName, isValidCedula } from '../utils/validators';
import { hasRole, hasAnyRole, getRoles } from '../utils/roles';
import Swal from 'sweetalert2';
import 'bootstrap/dist/css/bootstrap.min.css';

const SQUADUP_PRINT_URL = 'https://www.squadup.com/api/dashboard/payments/print_boca_tickets?ids=';

const TicketsPage = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { activa: escaneoActivo } = useScanSession();
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
  // Otros tickets de la misma Transaction ID y cuáles eligió el usuario
  // para completarlos con la misma información de canje
  const [ticketsTransaccion, setTicketsTransaccion] = useState([]);
  const [ticketsSeleccionados, setTicketsSeleccionados] = useState(new Set());
  const [printerEnabled, setPrinterEnabled] = useState(false); // ¿Función de impresión activa?
  const [ticketColors, setTicketColors] = useState([]); // [{ tipo, color }] configurado por el jefe
  const [printForm, setPrintForm] = useState({
    quienRetira: '',
    parentesco: '',
    quienOtro: '',
    celular: '',
    cedulaQuienRetira: ''
  });
  const [error, setError] = useState('');
  
  // Estados para selección múltiple (admin y staff)
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [showBulkCanjeModal, setShowBulkCanjeModal] = useState(false);
  const [bulkCanjeForm, setBulkCanjeForm] = useState({
    quienRetira: '',
    parentesco: '',
    quienOtro: '',
    celular: '',
    cedulaQuienRetira: ''
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

  // Determinar si el usuario es jefe (puede tener otros roles además)
  const isJefe = hasRole(user, 'jefe');

  // Cargar (y mantener en tiempo real) si la función de impresión está activa,
  // para decidir si un ticket canjeado se muestra en amarillo (pendiente de
  // imprimir por la cola) o en verde.
  useEffect(() => {
    printerSettingsService.getSettings()
      .then(res => {
        if (res.success) {
          setPrinterEnabled(res.data.enabled);
          setTicketColors(res.data.ticketColors || []);
        }
      })
      .catch(err => console.error('Error al obtener configuración de impresión:', err));

    const onSettingsUpdated = (data) => {
      setPrinterEnabled(data.enabled);
      setTicketColors(data.ticketColors || []);
    };
    socketService.on('printer-settings-updated', onSettingsUpdated);
    return () => socketService.off('printer-settings-updated', onSettingsUpdated);
  }, []);

  // Color configurado por el jefe para un tipo de ticket (campo "Ticket")
  const getTypeColor = useCallback((tipo) => {
    const entry = ticketColors.find(tc => tc.tipo === tipo);
    return entry ? entry.color : null;
  }, [ticketColors]);

  // Actualiza un ticket que ya está en la lista. NO agrega tickets nuevos:
  // si no está en pantalla es porque no pasa los filtros actuales, y meterlo
  // a la fuerza ensuciaría la búsqueda del usuario.
  const updateTicketInState = useCallback((updatedTicket) => {
    if (!updatedTicket || !updatedTicket['Ticket ID']) return;

    setTickets(prevTickets => {
      const ticketIndex = prevTickets.findIndex(t => t['Ticket ID'] === updatedTicket['Ticket ID']);
      if (ticketIndex === -1) return prevTickets;

      const newTickets = [...prevTickets];
      newTickets[ticketIndex] = { ...newTickets[ticketIndex], ...updatedTicket };
      return newTickets;
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

    // Conectar al servidor de WebSocket
    socketService.connect(token);

    // Sala común de tickets: la usan todos los roles, por eso las
    // actualizaciones llegan aunque el jefe no tenga punto de venta elegido.
    // (socket.io encola el emit si la conexión aún no terminó de abrirse)
    socketService.joinTickets();
    if (isJefe && selectedPuntoVenta) {
      socketService.joinPuntoVenta(selectedPuntoVenta);
    } else if (!isJefe && user?.puntoTrabajo) {
      socketService.joinStaff(user.puntoTrabajo);
    }

    // Handlers con nombre para poder quitarlos exactamente en el cleanup
    const onConnect = () => {
      setConnectionStatus('connected');
      socketConnectedRef.current = true;

      socketService.joinTickets();
      if (isJefe && selectedPuntoVenta) {
        socketService.joinPuntoVenta(selectedPuntoVenta);
      } else if (!isJefe && user?.puntoTrabajo) {
        socketService.joinStaff(user.puntoTrabajo);
      }
    };

    const onDisconnect = () => {
      setConnectionStatus('disconnected');
      socketConnectedRef.current = false;
    };

    // Se aplica SIEMPRE: es una actualización quirúrgica de una fila que ya
    // está en pantalla, así que no interfiere con la búsqueda ni con lo que
    // el usuario esté escribiendo. Antes se descartaba cuando había filtros
    // activos, y por eso un canje hecho desde otro dispositivo no se pintaba
    // hasta recargar la página.
    const onTicketUpdated = (data) => {
      updateTicketInState(data.ticket);
    };

    socketService.on('connect', onConnect);
    socketService.on('disconnect', onDisconnect);
    socketService.on('ticket-updated', onTicketUpdated);

    // Cleanup: se quitan SOLO los listeners de esta página, sin cerrar el
    // socket. Es un singleton compartido con el resto de la app (entre otros,
    // la sesión de escaneo del celular, que debe seguir viva al navegar).
    return () => {
      socketService.off('connect', onConnect);
      socketService.off('disconnect', onDisconnect);
      socketService.off('ticket-updated', onTicketUpdated);
      socketConnectedRef.current = false;
    };
    // Sin dependencias de búsqueda: antes el efecto se re-ejecutaba con cada
    // tecla, rearmando el socket y sus listeners constantemente.
  }, [token, isRealTimeActive, isJefe, selectedPuntoVenta, user?.puntoTrabajo, updateTicketInState]);
  
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
                oldTicket.fechaCanje !== newTicket.fechaCanje ||
                oldTicket.informacion !== newTicket.informacion) {
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
                oldTicket.fechaCanje !== newTicket.fechaCanje ||
                oldTicket.informacion !== newTicket.informacion) {
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
                oldTicket.fechaCanje !== newTicket.fechaCanje ||
                oldTicket.informacion !== newTicket.informacion) {
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

  // Trae los demás tickets de la transacción para que el usuario elija
  // cuáles se completan con la misma información de canje
  const fetchTicketsDeTransaccion = async (ticket) => {
    setTicketsTransaccion([]);
    setTicketsSeleccionados(new Set());
    if (!ticket?.['Transaction ID']) return;

    try {
      const response = await api.get(`/tickets/transaction/${ticket['Transaction ID']}`);
      if (response.data.success) {
        // Solo los que se pueden canjear: sin canjear, sin fraude, no eliminados
        const otros = (response.data.tickets || []).filter(t =>
          t['Ticket ID'] !== ticket['Ticket ID'] &&
          !t.canjeado && !t.fraude && !t.eliminado
        );
        setTicketsTransaccion(otros);
        // Por defecto vienen todos marcados: es el caso más común
        setTicketsSeleccionados(new Set(otros.map(t => t['Ticket ID'])));
      }
    } catch (error) {
      console.error('Error al obtener tickets de la transacción:', error);
    }
  };

  const toggleTicketTransaccion = (ticketId) => {
    setTicketsSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId); else next.add(ticketId);
      return next;
    });
  };

  const toggleTodosTicketsTransaccion = () => {
    setTicketsSeleccionados(prev =>
      prev.size === ticketsTransaccion.length
        ? new Set()
        : new Set(ticketsTransaccion.map(t => t['Ticket ID']))
    );
  };

  const handlePrint = (ticket) => {
    // Abrir modal para realizar canje
    setSelectedTicket(ticket);
    setShowPrintModal(true);
    fetchTicketsDeTransaccion(ticket);
  };

  const handleSendToPrint = async (ticket) => {
    // Función mantenida para compatibilidad - ahora abre modal de canje
    setSelectedTicket(ticket);
    setShowPrintModal(true);
    fetchTicketsDeTransaccion(ticket);
  };

  // Si venimos de /escanearTicket con un ticket encontrado, abrir directo el
  // modal correspondiente (canje si falta, o el detalle si ya está canjeado)
  const scannedProcessedRef = useRef(null);
  useEffect(() => {
    const scanned = location.state?.scannedTicket;
    const scannedAt = location.state?.scannedAt;
    if (!scanned || scannedProcessedRef.current === scannedAt) return;

    scannedProcessedRef.current = scannedAt;

    // Si ya hay un canje abierto, no se pisa: el operador está escribiendo
    // los datos de otra persona. Se avisa y se ignora ese escaneo.
    if (showPrintModal) {
      navigate(location.pathname, { replace: true, state: {} });
      Swal.fire({
        title: 'Termina el canje actual',
        text: 'Hay un canje abierto. Complétalo o ciérralo antes de escanear el siguiente boleto.',
        icon: 'warning',
        timer: 2600,
        showConfirmButton: false
      });
      return;
    }

    if (scanned.canjeado) {
      setSelectedCanjeInfo(scanned);
      setShowCanjeInfoModal(true);
    } else {
      handlePrint(scanned);
    }

    // Limpiar el state para que un refresh no vuelva a abrir el modal
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handlePrintSubmit = async (e) => {
    e.preventDefault();
    
    const roles = getRoles(user);
    
    // Validaciones del frontend
    if (!printForm.quienRetira) {
      Swal.fire('Falta información', 'Debe seleccionar quién retira el ticket', 'warning');
      return;
    }

    if (!printForm.celular) {
      Swal.fire('Falta información', 'El número de celular es obligatorio', 'warning');
      return;
    }

    if (!isValidPhone(printForm.celular)) {
      Swal.fire('Celular inválido', 'El celular debe contener solo números (7 a 15 dígitos)', 'warning');
      return;
    }

    if (!printForm.cedulaQuienRetira) {
      Swal.fire('Falta información', 'La cédula de quien retira el ticket es obligatoria', 'warning');
      return;
    }

    if (!isValidCedula(printForm.cedulaQuienRetira)) {
      Swal.fire('Cédula inválida', 'Ingrese un número de cédula, RUC o pasaporte válido (5 a 15 caracteres, con al menos un número)', 'warning');
      return;
    }

    if (printForm.quienRetira === 'Otro') {
      if (!printForm.parentesco) {
        Swal.fire('Falta información', 'Debe seleccionar el parentesco cuando selecciona "Otro"', 'warning');
        return;
      }
      if (!printForm.quienOtro) {
        Swal.fire('Falta información', 'Debe especificar el nombre de quien retira cuando selecciona "Otro"', 'warning');
        return;
      }
      if (!isValidName(printForm.quienOtro)) {
        Swal.fire('Nombre inválido', 'El nombre de quien retira solo debe contener letras', 'warning');
        return;
      }
    }

    // Rol impresor_solo: abrir SquadUp de forma síncrona (dentro del gesto del
    // usuario) para evitar que el navegador bloquee la ventana emergente.
    if (roles.includes('impresor_solo') && selectedTicket?.['Transaction ID']) {
      window.open(`${SQUADUP_PRINT_URL}${selectedTicket['Transaction ID']}`, '_blank');
    }

    try {
      if (roles.includes('staff') || roles.includes('jefe') || roles.includes('impresor_solo')) {
        // Preparar datos del canje
        const canjeData = {
          quienRetira: printForm.quienRetira,
          celular: printForm.celular,
          cedulaQuienRetira: printForm.cedulaQuienRetira
        };

        // Solo agregar campos adicionales si es "Otro"
        if (printForm.quienRetira === 'Otro') {
          canjeData.parentesco = printForm.parentesco;
          canjeData.quienOtro = printForm.quienOtro;
        }

        // Tickets de la misma transacción que el usuario marcó para
        // completar con esta misma información
        canjeData.ticketsSeleccionados = Array.from(ticketsSeleccionados);

        const canjeResponse = await api.post(`/tickets/${selectedTicket['Ticket ID']}/canje`, canjeData);
        const adicionales = canjeResponse.data?.data?.ticketsTransaccion || 0;

        Swal.fire({
          title: roles.includes('impresor_solo') ? 'Canjeado e impreso' : 'Canje realizado',
          text: adicionales > 0
            ? `Se completó la misma información en ${adicionales} ticket(s) más de la transacción`
            : undefined,
          icon: 'success',
          timer: adicionales > 0 ? 2500 : 1500,
          showConfirmButton: false
        });

        // Invalidar cache para forzar actualización
        if (api.invalidateCache) {
          api.invalidateCache('tickets');
          api.invalidateCache('puntos-venta');
        }
      }

      setShowPrintModal(false);
      setPrintForm({ quienRetira: '', parentesco: '', quienOtro: '', celular: '', cedulaQuienRetira: '' });
      setTicketsTransaccion([]); setTicketsSeleccionados(new Set());

      // Actualización suave inmediata (silenciosa)
      await refreshTicketsData(false);

      // Verificación adicional silenciosa después de 2 segundos
      setTimeout(() => {
        refreshTicketsData(false);
      }, 2000);
    } catch (error) {
      console.error('Error en proceso de canje:', error);

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

      Swal.fire('Error', errorMessage, 'error');
    }
  };

  const handleReprint = async (ticket, motivo) => {
    try {
      await api.post(`/tickets/${ticket['Ticket ID']}/reprint`, { motivo });
      Swal.fire({ title: 'Ticket reimpreso', icon: 'success', timer: 1500, showConfirmButton: false });
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
      Swal.fire('Error', error.response?.data?.message || 'Error al reimprimir ticket', 'error');
    }
  };

  const canPrint = (ticket) => {
    const roles = getRoles(user);

    // Si el ticket ya fue canjeado, no se puede volver a canjear
    if (ticket.canjeado) return false;

    // Marcado como fraude o eliminado del evento: canje bloqueado
    if (ticket.fraude || ticket.eliminado) return false;

    // Jefe, staff e impresor_solo pueden canjear (impresor_solo además imprime al canjear)
    return roles.includes('jefe') || roles.includes('staff') || roles.includes('impresor_solo');
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

  // Selecciona/deselecciona SOLO los tickets de la página actual, sin tocar
  // los que ya estaban marcados en otras páginas: antes esto reemplazaba
  // todo el Set global por el de la página actual, así que al paginar se
  // perdía lo ya seleccionado (y el checkbox de "seleccionar todos" quedaba
  // marcado en la página siguiente por comparar tamaños en vez de contenido).
  const idsPaginaActual = tickets.map(t => t['Ticket ID']);
  const todosPaginaActualSeleccionados = idsPaginaActual.length > 0 &&
    idsPaginaActual.every(id => selectedTickets.has(id));
  const algunoPaginaActualSeleccionado = idsPaginaActual.some(id => selectedTickets.has(id));

  const handleSelectAll = () => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev);
      if (todosPaginaActualSeleccionados) {
        idsPaginaActual.forEach(id => newSet.delete(id));
      } else {
        idsPaginaActual.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const handleClearSelection = () => setSelectedTickets(new Set());

  const handleBulkCanje = () => {
    if (selectedTickets.size === 0) {
      Swal.fire('Falta información', 'Debe seleccionar al menos un ticket', 'warning');
      return;
    }
    setShowBulkCanjeModal(true);
  };

  // Colocar / quitar la nota informativa en todos los tickets seleccionados
  // a la vez (solo jefe). A diferencia del canje masivo, acá no importa si
  // ya están canjeados o no.
  const handleBulkInformacion = async () => {
    if (selectedTickets.size === 0) {
      Swal.fire('Falta información', 'Debe seleccionar al menos un ticket', 'warning');
      return;
    }

    const cantidad = selectedTickets.size;
    const result = await Swal.fire({
      title: `Colocar información en ${cantidad} ticket(s)`,
      html: '<small>Se muestra en gris para todos los roles. No bloquea el canje.</small>',
      input: 'textarea',
      inputPlaceholder: 'Escribí la información a mostrar...',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c757d'
    });

    if (!result.isConfirmed) return;

    const texto = (result.value || '').trim();
    if (!texto) {
      Swal.fire('Falta información', 'Escribí el texto a mostrar', 'warning');
      return;
    }

    try {
      await ticketService.bulkMarcarInformacion(Array.from(selectedTickets), texto);
      Swal.fire({ title: 'Información guardada', icon: 'success', timer: 1500, showConfirmButton: false });
      setSelectedTickets(new Set());
      await refreshTicketsData(true);
    } catch (error) {
      console.error('Error al colocar información masiva:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo guardar la información', 'error');
    }
  };

  const handleBulkCanjeSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!bulkCanjeForm.quienRetira) {
      Swal.fire('Falta información', 'Debe seleccionar quién retira los tickets', 'warning');
      return;
    }

    if (!bulkCanjeForm.celular) {
      Swal.fire('Falta información', 'El número de celular es obligatorio', 'warning');
      return;
    }

    if (!isValidPhone(bulkCanjeForm.celular)) {
      Swal.fire('Celular inválido', 'El celular debe contener solo números (7 a 15 dígitos)', 'warning');
      return;
    }

    if (!bulkCanjeForm.cedulaQuienRetira) {
      Swal.fire('Falta información', 'La cédula de quien retira los tickets es obligatoria', 'warning');
      return;
    }

    if (!isValidCedula(bulkCanjeForm.cedulaQuienRetira)) {
      Swal.fire('Cédula inválida', 'Ingrese un número de cédula, RUC o pasaporte válido (5 a 15 caracteres, con al menos un número)', 'warning');
      return;
    }

    if (bulkCanjeForm.quienRetira === 'Otro') {
      if (!bulkCanjeForm.parentesco) {
        Swal.fire('Falta información', 'Debe seleccionar el parentesco cuando selecciona "Otro"', 'warning');
        return;
      }
      if (!bulkCanjeForm.quienOtro) {
        Swal.fire('Falta información', 'Debe especificar el nombre de quien retira cuando selecciona "Otro"', 'warning');
        return;
      }
      if (!isValidName(bulkCanjeForm.quienOtro)) {
        Swal.fire('Nombre inválido', 'El nombre de quien retira solo debe contener letras', 'warning');
        return;
      }
    }

    const roles = getRoles(user);

    // Rol impresor_solo: abrir SquadUp de forma síncrona con todas las
    // Transaction ID involucradas (unidas por coma) antes de esperar al API.
    if (roles.includes('impresor_solo')) {
      const transactionIds = [...new Set(
        tickets
          .filter(t => selectedTickets.has(t['Ticket ID']))
          .map(t => t['Transaction ID'])
          .filter(Boolean)
      )];
      if (transactionIds.length > 0) {
        window.open(`${SQUADUP_PRINT_URL}${transactionIds.join(',')}`, '_blank');
      }
    }

    try {
      const canjeData = {
        quienRetira: bulkCanjeForm.quienRetira,
        celular: bulkCanjeForm.celular,
        cedulaQuienRetira: bulkCanjeForm.cedulaQuienRetira
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
        const { updated, alreadyRedeemed, ticketsPropagados } = response.data.data;
        let texto = roles.includes('impresor_solo')
          ? `${updated} tickets canjeados e impresos`
          : `${updated} tickets canjeados`;
        if (ticketsPropagados > 0) {
          texto += ` (+${ticketsPropagados} más de la misma transacción)`;
        }
        if (alreadyRedeemed > 0) {
          texto += ` (${alreadyRedeemed} ya estaban canjeados)`;
        }
        Swal.fire({ title: 'Canje masivo exitoso', text: texto, icon: 'success', timer: 2800, showConfirmButton: false });

        // Limpiar selección y cerrar modal
        setSelectedTickets(new Set());
        setShowBulkCanjeModal(false);
        setBulkCanjeForm({ quienRetira: '', parentesco: '', quienOtro: '', celular: '', cedulaQuienRetira: '' });

        // Actualizar tickets SIN resetear filtros
        await refreshTicketsData(true);
      }
    } catch (error) {
      console.error('Error en canje masivo:', error);
      Swal.fire('Error', error.response?.data?.message || 'Error al canjear tickets', 'error');
    }
  };

  // Marcar / quitar la marca de fraude (solo jefe)
  const handleToggleFraude = async (ticket) => {
    const marcando = !ticket.fraude;

    if (marcando) {
      const { value: motivo, isConfirmed } = await Swal.fire({
        title: 'Marcar como FRAUDE',
        html: `Ticket <code>${ticket['Ticket ID']}</code> — ${ticket['First Name'] || ''} ${ticket['Last Name'] || ''}<br/>` +
              '<small>No se va a poder canjear mientras esté marcado.</small>',
        input: 'text',
        inputPlaceholder: 'Motivo (opcional)',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Marcar como fraude',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545'
      });
      if (!isConfirmed) return;

      try {
        await ticketService.marcarFraude(ticket['Ticket ID'], true, motivo || '');
        Swal.fire({ title: 'Marcado como fraude', icon: 'success', timer: 1500, showConfirmButton: false });
        await refreshTicketsData(false);
      } catch (error) {
        console.error('Error al marcar fraude:', error);
        Swal.fire('Error', error.response?.data?.message || 'No se pudo marcar como fraude', 'error');
      }
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Quitar marca de fraude',
      text: 'El ticket volverá a poder canjearse.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Quitar marca',
      cancelButtonText: 'Cancelar'
    });
    if (!isConfirmed) return;

    try {
      await ticketService.marcarFraude(ticket['Ticket ID'], false);
      Swal.fire({ title: 'Marca retirada', icon: 'success', timer: 1500, showConfirmButton: false });
      await refreshTicketsData(false);
    } catch (error) {
      console.error('Error al quitar fraude:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo quitar la marca', 'error');
    }
  };

  // Colocar / editar / quitar una nota informativa en un ticket (solo jefe).
  // A diferencia de fraude, NO bloquea el canje: solo pinta la fila de gris
  // y muestra el texto a todos los roles.
  const handleSetInformacion = async (ticket) => {
    const result = await Swal.fire({
      title: ticket.informacion ? 'Editar información' : 'Colocar información',
      html: `Ticket <code>${ticket['Ticket ID']}</code> — ${ticket['First Name'] || ''} ${ticket['Last Name'] || ''}<br/>` +
            '<small>Se muestra en gris para todos los roles. No bloquea el canje.</small>',
      input: 'textarea',
      inputValue: ticket.informacion || '',
      inputPlaceholder: 'Escribí la información a mostrar...',
      icon: 'info',
      showCancelButton: true,
      showDenyButton: !!ticket.informacion,
      denyButtonText: 'Quitar información',
      confirmButtonText: ticket.informacion ? 'Actualizar' : 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#6c757d'
    });

    if (result.isConfirmed) {
      const texto = (result.value || '').trim();
      if (!texto) {
        Swal.fire('Falta información', 'Escribí el texto a mostrar', 'warning');
        return;
      }
      try {
        await ticketService.marcarInformacion(ticket['Ticket ID'], texto);
        Swal.fire({ title: 'Información guardada', icon: 'success', timer: 1400, showConfirmButton: false });
        await refreshTicketsData(false);
      } catch (error) {
        console.error('Error al guardar información:', error);
        Swal.fire('Error', error.response?.data?.message || 'No se pudo guardar la información', 'error');
      }
      return;
    }

    if (result.isDenied) {
      try {
        await ticketService.marcarInformacion(ticket['Ticket ID'], '');
        Swal.fire({ title: 'Información quitada', icon: 'success', timer: 1400, showConfirmButton: false });
        await refreshTicketsData(false);
      } catch (error) {
        console.error('Error al quitar información:', error);
        Swal.fire('Error', error.response?.data?.message || 'No se pudo quitar la información', 'error');
      }
    }
  };

  const getPrintButtonText = (ticket) => {
    const roles = getRoles(user);

    // Si ya está canjeado, mostrar estado canjeado
    if (ticket.canjeado) {
      return 'Canjeado';
    }

    if (roles.includes('jefe') || roles.includes('staff')) {
      return 'Realizar Canje';
    }

    if (roles.includes('impresor_solo')) {
      return 'Canjear e Imprimir';
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

  // Función para obtener el estado de impresión de un ticket. La impresión
  // es por Transaction ID: un ticket puede quedar impreso aunque todavía no
  // se haya canjeado individualmente (porque otro ticket de su misma
  // transacción sí se imprimió), por eso 'impreso' y 'canjeado' se evalúan
  // de forma independiente.
  // 'completed' (verde) = canjeado + impreso (o impresión no activa)
  // 'pending' (amarillo) = canjeado, esperando impresión por la cola
  // 'printed' (azul) = impreso pero aún no canjeado individualmente
  const getTicketPrintStatus = (ticket) => {
    // Fraude y eliminado mandan sobre cualquier otro estado: son bloqueos
    if (ticket.fraude) return 'fraude';
    if (ticket.eliminado) return 'eliminado';
    // Nota informativa del jefe: no bloquea el canje, pero se pinta gris
    // para que todos la vean mientras esté colocada
    if (ticket.informacion) return 'informacion';
    if (ticket.canjeado && (ticket.impreso || !printerEnabled)) return 'completed';
    if (ticket.canjeado) return 'pending';
    if (ticket.impreso) return 'printed';
    return 'normal';
  };

  // Función para obtener las clases CSS según el estado
  const getRowClasses = (ticket) => {
    switch (getTicketPrintStatus(ticket)) {
      case 'fraude':
      case 'eliminado':
        return 'table-danger'; // Rojo: fraude o eliminado del evento
      case 'informacion':
        return 'table-secondary'; // Gris: nota informativa del jefe
      case 'pending':
        return 'table-warning'; // Amarillo: canjeado, esperando impresión
      case 'completed':
        return 'table-success'; // Verde: canjeado (e impreso, si aplica)
      case 'printed':
        return 'table-info'; // Azul: impreso, pendiente de canje individual
      default:
        return '';
    }
  };

  // Función para obtener información de impresión de un ticket
  const getTicketPrintInfo = (ticket) => {
    if (!ticket.canjeado && !ticket.impreso) return null;

    const retiraInfo = ticket.quienRetira === 'Otro' && ticket.quienOtro ?
      `${ticket.quienRetira} (${ticket.parentesco || 'N/A'}: ${ticket.quienOtro})` :
      ticket.quienRetira || 'N/A';

    let estado;
    if (ticket.canjeado && printerEnabled && !ticket.impreso) estado = 'Canjeado (pendiente de imprimir)';
    else if (ticket.canjeado) estado = 'Canjeado';
    else estado = 'Impreso (pendiente de canje)';

    return {
      estado,
      fecha: ticket.fechaCanje ? new Date(ticket.fechaCanje).toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) : (ticket.fechaImpresion ? new Date(ticket.fechaImpresion).toLocaleString('es-ES') : 'N/A'),
      responsable: ticket.usuarioResponsable?.nombre || ticket.usuarioResponsable?.usuario || 'N/A',
      quienRetira: retiraInfo,
      celular: ticket.celular || 'N/A'
    };
  };

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
                          className="badge bg-primary"
                          style={{
                            fontSize: '0.85em',
                            opacity: col === activeCollection.current ? 1 : 0.7
                          }}
                          title={col === activeCollection.current ? 'Colección en uso' : 'También disponible hoy'}
                        >
                          📅 {col}
                          {col === activeCollection.current && ' ✓'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    /* Una sola colección activa */
                    <span className="badge bg-primary" style={{ fontSize: '0.9em' }}>
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

              {/* Colocar información en varios a la vez (solo jefe) */}
              {isJefe && selectedTickets.size > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleBulkInformacion}
                  style={{fontSize: '0.8em'}}
                >
                  <i className="fas fa-circle-info me-1"></i>
                  Colocar Información ({selectedTickets.size})
                </button>
              )}

              {/* Limpiar selección: la selección se mantiene al cambiar de
                  página, así que hace falta una forma explícita de vaciarla */}
              {selectedTickets.size > 0 && (
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleClearSelection}
                  style={{fontSize: '0.8em'}}
                >
                  <i className="fas fa-times me-1"></i>
                  Cancelar Seleccionados
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
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Búsqueda</h5>
              <div className="d-flex align-items-center gap-2">
                {escaneoActivo && (
                  <span className="badge bg-success" title="El celular está vinculado: puedes escanear el siguiente boleto sin volver a emparejarlo">
                    <i className="fas fa-mobile-alt me-1"></i>Escáner conectado
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm"
                  onClick={() => navigate('/escanearTicket')}
                  title="Buscar un ticket escaneando su código de barras/QR"
                >
                  <i className="fas fa-qrcode me-1"></i>Escanear
                </button>
              </div>
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

          {/* Validaciones para mostrar contenido. El jefe ve todos los
              tickets de todas las localidades por default (ya se cargan
              con fetchAllTickets sin necesidad de elegir nada); elegir un
              punto de venta es opcional, para filtrar. */}
          {!isJefe && !user?.puntoTrabajo ? (
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
                    {/* Información de resultados */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <span className="text-muted">
                          Mostrando {tickets.length} de {pagination.total} tickets
                          {search.trim() && ` (filtrados por "${search}")`}
                        </span>
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
                                checked={todosPaginaActualSeleccionados}
                                ref={el => {
                                  if (el) el.indeterminate = algunoPaginaActualSeleccionado && !todosPaginaActualSeleccionados;
                                }}
                                title="Seleccionar todos (de esta página)"
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
                                  {getTypeColor(ticket['Ticket']) ? (
                                    <span
                                      className="badge"
                                      style={{ backgroundColor: getTypeColor(ticket['Ticket']), color: '#fff' }}
                                    >
                                      {ticket['Ticket']}
                                    </span>
                                  ) : (
                                    <small>{ticket['Ticket']}</small>
                                  )}
                                </td>
                                <td>
                                  <small>{getCedula(ticket) || '-'}</small>
                                </td>
                                <td>
                                  <code style={{fontSize: '0.8em'}}>{ticket['Ticket ID']}</code>
                                </td>
                                <td>
                                  <code style={{fontSize: '0.8em'}}>{ticket['Transaction ID']}</code>
                                </td>
                                <td>
                                  {isJefe && (
                                    <button
                                      className={`btn btn-sm me-1 ${ticket.fraude ? 'btn-danger' : 'btn-outline-danger'}`}
                                      onClick={() => handleToggleFraude(ticket)}
                                      title={ticket.fraude
                                        ? `Marcado como fraude${ticket.motivoFraude ? `: ${ticket.motivoFraude}` : ''}. Click para quitar la marca.`
                                        : 'Marcar este ticket como fraude (bloquea el canje)'}
                                    >
                                      <i className="fas fa-ban"></i> Fraude
                                    </button>
                                  )}
                                  {isJefe && (
                                    <button
                                      className={`btn btn-sm me-1 ${ticket.informacion ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                      onClick={() => handleSetInformacion(ticket)}
                                      title={ticket.informacion
                                        ? `Información: ${ticket.informacion}. Click para editar o quitar.`
                                        : 'Colocar una nota informativa (se muestra en gris para todos, no bloquea el canje)'}
                                    >
                                      <i className="fas fa-circle-info"></i> Info
                                    </button>
                                  )}
                                  {ticket.informacion && (
                                    <div className="text-secondary fw-semibold" style={{ fontSize: '0.75em', marginBottom: '4px' }}>
                                      <i className="fas fa-circle-info me-1"></i>{ticket.informacion}
                                    </div>
                                  )}
                                  {ticket.fraude ? (
                                    <span className="text-danger fw-semibold" style={{ fontSize: '0.8em' }}>
                                      Canje bloqueado
                                    </span>
                                  ) : ticket.eliminado ? (
                                    <span className="text-danger fw-semibold" style={{ fontSize: '0.8em' }}>
                                      Eliminado del evento
                                    </span>
                                  ) : ticket.canjeado ? (
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
                                          onClick={async () => {
                                            const roles = getRoles(user);

                                            if (roles.includes('staff')) {
                                              // Staff usa el modal para reimpresiones también
                                              handleSendToPrint(ticket);
                                            } else {
                                              // Jefe/Impresor reimprimen directamente
                                              const { value: motivo } = await Swal.fire({
                                                title: 'Motivo de reimpresión',
                                                input: 'text',
                                                inputPlaceholder: 'Ingrese el motivo...',
                                                showCancelButton: true,
                                                confirmButtonText: 'Reimprimir',
                                                cancelButtonText: 'Cancelar',
                                                inputValidator: (value) => !value && 'Debe ingresar un motivo'
                                              });
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
                      {hasAnyRole(user, ['staff', 'impresor_solo']) ? 'Realizar Canje' : 'Canje de Ticket'}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => { setShowPrintModal(false); setTicketsTransaccion([]); setTicketsSeleccionados(new Set()); }}
                    ></button>
                  </div>
                  <form onSubmit={handlePrintSubmit}>
                    <div className="modal-body">
                      <div className="alert alert-info">
                        <strong>Ticket:</strong> {`${selectedTicket['First Name']} ${selectedTicket['Last Name']}`}<br />
                        <strong>Asiento:</strong> {selectedTicket['Seat']}<br />
                        <strong>Ticket ID:</strong> {selectedTicket['Ticket ID']}<br />
                        <strong>Categoría:</strong>{' '}
                        {getTypeColor(selectedTicket['Ticket']) ? (
                          <span
                            className="badge"
                            style={{ backgroundColor: getTypeColor(selectedTicket['Ticket']), color: '#fff' }}
                          >
                            {selectedTicket['Ticket']}
                          </span>
                        ) : (
                          selectedTicket['Ticket']
                        )}
                        <br />
                        <strong>Cédula:</strong> {getCedula(selectedTicket) || '-'}<br />
                        <strong>Pago:</strong> {getLast4(selectedTicket)}
                      </div>

                      {ticketsTransaccion.length > 0 && (
                        <div className="card mb-3 border-warning">
                          <div className="card-header d-flex justify-content-between align-items-center bg-warning-subtle">
                            <span>
                              <i className="fas fa-users me-2"></i>
                              Otros {ticketsTransaccion.length} ticket(s) de esta transacción
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={toggleTodosTicketsTransaccion}
                            >
                              {ticketsSeleccionados.size === ticketsTransaccion.length
                                ? 'Quitar todos'
                                : 'Seleccionar todos'}
                            </button>
                          </div>
                          <div className="card-body py-2" style={{ maxHeight: 190, overflowY: 'auto' }}>
                            <small className="text-muted d-block mb-2">
                              Marca los que se canjean junto con este, con la misma información.
                            </small>
                            {ticketsTransaccion.map(t => (
                              <div className="form-check" key={t['Ticket ID']}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`tx-${t['Ticket ID']}`}
                                  checked={ticketsSeleccionados.has(t['Ticket ID'])}
                                  onChange={() => toggleTicketTransaccion(t['Ticket ID'])}
                                />
                                <label className="form-check-label" htmlFor={`tx-${t['Ticket ID']}`}>
                                  <code>{t['Ticket ID']}</code>
                                  {' — '}
                                  <span className="chip-seat"><i className="bi bi-person-square"></i>{t['Seat']}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                        <label className="form-label">Cédula de quien retira *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Cédula, RUC o pasaporte"
                          value={printForm.cedulaQuienRetira}
                          maxLength={15}
                          onChange={(e) => setPrintForm({...printForm, cedulaQuienRetira: onlyAlphanumeric(e.target.value)})}
                        />
                      </div>

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
                        onClick={() => { setShowPrintModal(false); setTicketsTransaccion([]); setTicketsSeleccionados(new Set()); }}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {hasAnyRole(user, ['staff', 'impresor_solo']) ? 'Realizar Canje' : 'Canje'}
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
                        Todos recibirán la misma información de canje. Si alguno de estos tickets comparte
                        Transaction ID con otro ticket no seleccionado, esa información también se completará
                        automáticamente en el ticket faltante.
                        {hasRole(user, 'impresor_solo') && (
                          <> También se enviarán a imprimir juntos (impresión masiva).</>
                        )}
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
                                      Ticket: <code>{ticket['Ticket ID']}</code><br />
                                      Categoría:{' '}
                                      {getTypeColor(ticket['Ticket']) ? (
                                        <span
                                          className="badge"
                                          style={{ backgroundColor: getTypeColor(ticket['Ticket']), color: '#fff' }}
                                        >
                                          {ticket['Ticket']}
                                        </span>
                                      ) : ticket['Ticket']}
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
                        <label className="form-label">Cédula de quien retira *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Cédula, RUC o pasaporte"
                          value={bulkCanjeForm.cedulaQuienRetira}
                          maxLength={15}
                          onChange={(e) => setBulkCanjeForm({...bulkCanjeForm, cedulaQuienRetira: onlyAlphanumeric(e.target.value)})}
                        />
                      </div>

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
                        <strong>Cédula de quien retira:</strong>
                        <p className="text-muted">{selectedCanjeInfo.cedulaQuienRetira || '-'}</p>
                      </div>
                    </div>

                    <div className="row mb-3">
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
