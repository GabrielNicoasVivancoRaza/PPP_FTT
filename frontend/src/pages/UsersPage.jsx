import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const UsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPuntos, setLoadingPuntos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '',
    rol: 'staff',
    puntoTrabajo: ''
  });

  useEffect(() => {
    if (user?.rol === 'jefe') {
      fetchUsers();
      fetchPuntosVenta();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchPuntosVenta = async () => {
    try {
      setLoadingPuntos(true);
      const response = await api.get('/puntos-venta');
      if (response.data.success) {
        setPuntosVenta(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching puntos de venta:', error);
      console.warn('No se pudieron cargar los puntos de venta');
    } finally {
      setLoadingPuntos(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que si es staff/impresor tenga punto de trabajo
    if ((formData.rol === 'staff' || formData.rol === 'impresor') && !formData.puntoTrabajo) {
      alert('Debe seleccionar un punto de trabajo para usuarios staff e impresor');
      return;
    }

    // Validar que el punto de trabajo seleccionado existe
    if (formData.puntoTrabajo && !puntosVenta.some(p => p.nombre === formData.puntoTrabajo)) {
      alert('El punto de trabajo seleccionado no es válido. Por favor actualice la lista.');
      return;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, formData);
        alert('Usuario actualizado exitosamente');
      } else {
        await api.post('/users', formData);
        alert('Usuario creado exitosamente');
      }
      
      setShowModal(false);
      setEditingUser(null);
      setFormData({ nombre: '', usuario: '', rol: 'staff', puntoTrabajo: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      nombre: userToEdit.nombre,
      usuario: userToEdit.usuario,
      rol: userToEdit.rol,
      puntoTrabajo: userToEdit.puntoTrabajo || ''
    });
    setShowModal(true);
    fetchPuntosVenta(); // Refrescar puntos de venta al editar
  };

  const handleDelete = async (userId) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await api.delete(`/users/${userId}`);
        alert('Usuario eliminado exitosamente');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(error.response?.data?.message || 'Error al eliminar usuario');
      }
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', usuario: '', rol: 'staff', puntoTrabajo: '' });
    setEditingUser(null);
    setShowModal(false);
  };

  if (user?.rol !== 'jefe') {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          No tiene permisos para acceder a esta página.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Gestión de Usuarios</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowModal(true);
                fetchPuntosVenta(); // Refrescar puntos de venta al abrir modal
              }}
            >
              <i className="fas fa-plus"></i> Nuevo Usuario
            </button>
          </div>

          {loading ? (
            <div className="d-flex justify-content-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Punto de Trabajo</th>
                        <th>Estado</th>
                        <th>Primer Acceso</th>
                        <th>Creado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(userItem => (
                        <tr key={userItem._id}>
                          <td>{userItem.nombre}</td>
                          <td>{userItem.usuario}</td>
                          <td>
                            <span className={`badge bg-${
                              userItem.rol === 'jefe' ? 'danger' : 
                              userItem.rol === 'staff' ? 'primary' : 'success'
                            }`}>
                              {userItem.rol}
                            </span>
                          </td>
                          <td>{userItem.puntoTrabajo || '-'}</td>
                          <td>
                            <span className={`badge bg-${userItem.activo ? 'success' : 'secondary'}`}>
                              {userItem.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            {userItem.primerAcceso ? (
                              <span className="badge bg-warning">Pendiente</span>
                            ) : (
                              <span className="badge bg-success">Completado</span>
                            )}
                          </td>
                          <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleEdit(userItem)}
                                title="Editar"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              {userItem._id !== user._id && (
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(userItem._id)}
                                  title="Eliminar"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={resetForm}
                    ></button>
                  </div>
                  <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label">Nombre *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.nombre}
                          onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                          required
                        />
                      </div>
                      
                      {!editingUser && (
                        <div className="mb-3">
                          <label className="form-label">Usuario (Email) *</label>
                          <input
                            type="email"
                            className="form-control"
                            value={formData.usuario}
                            onChange={(e) => setFormData({...formData, usuario: e.target.value})}
                            required
                          />
                          <small className="form-text text-muted">
                            La contraseña inicial será: FTT2025
                          </small>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label">Rol *</label>
                        <select
                          className="form-select"
                          value={formData.rol}
                          onChange={(e) => setFormData({...formData, rol: e.target.value})}
                          disabled={editingUser}
                          required
                        >
                          <option value="staff">Staff</option>
                          <option value="impresor">Impresor</option>
                        </select>
                      </div>

                      {(formData.rol === 'staff' || formData.rol === 'impresor') && (
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <label className="form-label">Punto de Trabajo *</label>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={fetchPuntosVenta}
                              disabled={loadingPuntos}
                            >
                              {loadingPuntos ? (
                                <span className="spinner-border spinner-border-sm me-1"></span>
                              ) : (
                                <i className="fas fa-sync-alt me-1"></i>
                              )}
                              Actualizar
                            </button>
                          </div>
                          <select
                            className="form-select"
                            value={formData.puntoTrabajo}
                            onChange={(e) => setFormData({...formData, puntoTrabajo: e.target.value})}
                            required
                            disabled={loadingPuntos}
                          >
                            <option value="">
                              {loadingPuntos ? 'Cargando puntos de venta...' : 'Seleccione un punto de venta'}
                            </option>
                            {puntosVenta.map(punto => (
                              <option key={punto._id} value={punto.nombre}>
                                {punto.nombre} ({punto.localidades.join(', ')})
                              </option>
                            ))}
                          </select>
                          {puntosVenta.length === 0 && !loadingPuntos && (
                            <small className="form-text text-warning">
                              No hay puntos de venta disponibles. Debe crear algunos primero en la sección "Puntos de Venta".
                            </small>
                          )}
                          {puntosVenta.length > 0 && (
                            <small className="form-text text-muted">
                              El staff solo podrá ver tickets de las localidades asociadas a este punto de venta.
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={resetForm}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {editingUser ? 'Actualizar' : 'Crear'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
