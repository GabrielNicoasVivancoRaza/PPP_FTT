import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Swal from 'sweetalert2';
import { onlyLetters, isValidName } from '../utils/validators';
import 'bootstrap/dist/css/bootstrap.min.css';

const ROLE_INFO = {
  jefe: { label: 'Jefe', className: 'role-badge-jefe' },
  staff: { label: 'Staff', className: 'role-badge-staff' },
  impresor_solo: { label: 'Impresor', className: 'role-badge-impresor_solo' },
  impresor_cola: { label: 'Impresor (Cola)', className: 'role-badge-impresor_cola' },
  importador: { label: 'Importador', className: 'role-badge-importador' }
};

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
      Swal.fire('Error', 'Error al cargar usuarios', 'error');
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

    if (!isValidName(formData.nombre)) {
      Swal.fire('Falta información', 'El nombre solo debe contener letras', 'warning');
      return;
    }

    // Todos los roles excepto jefe e importador requieren punto de trabajo
    if (formData.rol !== 'jefe' && formData.rol !== 'importador' && !formData.puntoTrabajo) {
      Swal.fire('Falta información', 'Debe seleccionar un punto de trabajo', 'warning');
      return;
    }

    // Validar que el punto de trabajo seleccionado existe
    if (formData.puntoTrabajo && !puntosVenta.some(p => p.nombre === formData.puntoTrabajo)) {
      Swal.fire('Punto de trabajo inválido', 'Por favor actualice la lista.', 'warning');
      return;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser._id}`, formData);
        Swal.fire({ title: 'Usuario actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
      } else {
        await api.post('/users', formData);
        Swal.fire({ title: 'Usuario creado', icon: 'success', timer: 1500, showConfirmButton: false });
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({ nombre: '', usuario: '', rol: 'staff', puntoTrabajo: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      Swal.fire('Error', error.response?.data?.message || 'Error al guardar usuario', 'error');
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

  const handleToggleActivo = async (userId, userName, activar) => {
    const result = await Swal.fire({
      title: activar ? '¿Activar usuario?' : '¿Desactivar usuario?',
      text: activar
        ? `"${userName}" va a poder volver a iniciar sesión.`
        : `"${userName}" no va a poder iniciar sesión ni operar. Sus datos y su historial de canjes/auditoría se conservan, y podés reactivarlo cuando quieras.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: activar ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      await api.put(`/users/${userId}`, { activo: activar });
      fetchUsers();
      Swal.fire({
        title: activar ? 'Usuario activado' : 'Usuario desactivado',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo actualizar el usuario', 'error');
    }
  };

  const handleHardDelete = async (userId, userName) => {
    const result = await Swal.fire({
      title: '¿Eliminar usuario permanentemente?',
      html: `Se va a borrar a <strong>"${userName}"</strong> de la base de datos, sin poder recuperarlo.<br/><br/>` +
        '<span class="text-danger">Los tickets y registros de auditoría donde participó ya no van a poder mostrar su nombre.</span><br/>' +
        'Si preferís conservar el historial, usá "Desactivar" en vez de esto.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar permanentemente',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/users/${userId}/permanent`);
      fetchUsers();
      Swal.fire({
        title: 'Eliminado permanentemente',
        text: `"${userName}" fue borrado de la base de datos.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al eliminar usuario permanentemente:', error);
      Swal.fire('Error', error.response?.data?.message || 'No se pudo eliminar el usuario', 'error');
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
                            <span className={`table-tag table-tag-${ROLE_INFO[userItem.rol] ? userItem.rol : 'default'}`}>
                              {(ROLE_INFO[userItem.rol] || {}).label || userItem.rol}
                            </span>
                          </td>
                          <td>{userItem.puntoTrabajo || '-'}</td>
                          <td>
                            <span className={`table-tag ${userItem.activo ? 'table-tag-active' : 'table-tag-inactive'}`}>
                              {userItem.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            {userItem.primerAcceso ? (
                              <span className="table-tag table-tag-pending">Pendiente</span>
                            ) : (
                              <span className="table-tag table-tag-active">Completado</span>
                            )}
                          </td>
                          <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-icon btn-icon-edit"
                                onClick={() => handleEdit(userItem)}
                                title="Editar"
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              {userItem._id !== user._id && (
                                <>
                                  <button
                                    className="btn btn-sm btn-icon"
                                    onClick={() => handleToggleActivo(userItem._id, userItem.nombre, !userItem.activo)}
                                    title={userItem.activo ? 'Desactivar' : 'Activar'}
                                  >
                                    <i className={`bi ${userItem.activo ? 'bi-slash-circle' : 'bi-check-circle'}`}></i>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-icon btn-icon-delete"
                                    onClick={() => handleHardDelete(userItem._id, userItem.nombre)}
                                    title="Eliminar permanentemente"
                                  >
                                    <i className="bi bi-trash3"></i>
                                  </button>
                                </>
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
                          onChange={(e) => setFormData({...formData, nombre: onlyLetters(e.target.value)})}
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
                          disabled={editingUser && editingUser._id === user._id}
                          required
                        >
                          <option value="staff">Staff</option>
                          <option value="impresor_solo">Impresor (canjea e imprime él mismo)</option>
                          <option value="impresor_cola">Impresor (recibe cola de solicitudes)</option>
                          <option value="importador">Importador (sube el CSV del evento)</option>
                        </select>
                        {editingUser && editingUser._id === user._id && (
                          <small className="form-text text-muted">
                            No podés cambiar tu propio rol.
                          </small>
                        )}
                      </div>

                      {formData.rol !== 'jefe' && formData.rol !== 'importador' && (
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
                            {puntosVenta.filter(punto => punto.activo !== false).map(punto => (
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
                          {puntosVenta.length > 0 && formData.rol === 'impresor_cola' && (
                            <small className="form-text text-muted">
                              La cola de impresión es compartida entre todos los puntos de venta; este punto es solo informativo.
                            </small>
                          )}
                          {puntosVenta.length > 0 && formData.rol !== 'impresor_cola' && (
                            <small className="form-text text-muted">
                              Solo podrá ver tickets de las localidades asociadas a este punto de venta.
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
