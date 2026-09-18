import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            token,
            user: JSON.parse(user),
          },
        });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);

    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));

    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: response,
    });

    return response;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Desvincular el celular al cerrar sesión, para que la sesión de
      // escaneo no quede activa para el siguiente usuario del equipo
      localStorage.removeItem('ftt_scan_session');
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Cambia el punto de trabajo activo (de los varios que puede tener
  // asignados un usuario) y actualiza el estado local + localStorage para
  // que el resto de la app (filtros de tickets, salas de socket, etc.) lo
  // use de inmediato sin tener que volver a loguearse.
  const switchPuntoTrabajo = async (puntoTrabajo) => {
    const response = await authService.switchPuntoTrabajo(puntoTrabajo);

    dispatch({
      type: 'UPDATE_USER',
      payload: { puntoTrabajo: response.user.puntoTrabajo },
    });

    const updatedUser = { ...state.user, puntoTrabajo: response.user.puntoTrabajo };
    localStorage.setItem('user', JSON.stringify(updatedUser));

    return response;
  };

  const changePassword = async (passwordData) => {
    const response = await authService.changePassword(passwordData);

    // Actualizar el estado del usuario si es necesario
    if (state.user.primerAcceso) {
      dispatch({
        type: 'UPDATE_USER',
        payload: { primerAcceso: false },
      });

      const updatedUser = { ...state.user, primerAcceso: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }

    return response;
  };

  const value = {
    ...state,
    login,
    logout,
    changePassword,
    switchPuntoTrabajo,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
