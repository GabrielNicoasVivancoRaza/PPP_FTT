import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PuntosVenta = () => {
  const { user, token } = useAuth();
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [localidadesDisponibles, setLocalidadesDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPunto, setEditingPunto] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    localidades: []
  });

  useEffect(() => {
    fetchPuntosVenta();
    fetchLocalidadesDisponibles();
  }, []);

  const fetchPuntosVenta = async () => {
    try {
      setLoading(true);
      const response = await api.get('/puntos-venta');

      if (response.data.success) {
        setPuntosVenta(response.data.data);
      } else {
        setError(response.data.message || 'Error al cargar puntos de venta');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalidadesDisponibles = async () => {
    try {
      setLoadingLocalidades(true);
      const response = await api.get('/puntos-venta/localidades/disponibles');

      if (response.data.success) {
        setLocalidadesDisponibles(response.data.data.localidades || []);
      } else {
        console.error('Error al obtener localidades:', response.data.message);
        // Usar valores por defecto si hay error
        setLocalidadesDisponibles([]);
      }
    } catch (error) {
      console.error('Error al obtener localidades disponibles:', error);
      // No mostrar error de forma intrusiva, solo en consola
      setLocalidadesDisponibles([]);
    } finally {
      setLoadingLocalidades(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || formData.localidades.length === 0) {
      setError('Nombre y al menos una localidad son requeridos');
      return;
    }

    try {
      let response;
      if (editingPunto) {
        response = await api.put(`/puntos-venta/${editingPunto._id}`, formData);
      } else {
        response = await api.post('/puntos-venta', formData);
      }
      
      if (response.data.success) {
        fetchPuntosVenta();
        handleCloseModal();
        setError('');
      } else {
        setError(response.data.message || 'Error al guardar punto de venta');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    }
  };

  const handleEdit = (punto) => {
    setEditingPunto(punto);
    setFormData({
      nombre: punto.nombre,
      descripcion: punto.descripcion || '',
      localidades: punto.localidades
    });
    setShowModal(true);
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el punto de venta "${nombre}"?`)) {
      return;
    }

    try {
      const response = await api.delete(`/puntos-venta/${id}`);
      
      if (response.data.success) {
        fetchPuntosVenta();
        setError('');
      } else {
        setError(response.data.message || 'Error al eliminar punto de venta');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPunto(null);
    setFormData({
      nombre: '',
      descripcion: '',
      localidades: []
    });
    setError('');
  };

  const handleLocalidadChange = (localidad) => {
    const updatedLocalidades = formData.localidades.includes(localidad)
      ? formData.localidades.filter(l => l !== localidad)
      : [...formData.localidades, localidad];
    
    setFormData({ ...formData, localidades: updatedLocalidades });
  };

  if (user?.role !== 'jefe' && user?.rol !== 'jefe') {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <h4>Acceso Denegado</h4>
          <p>Solo los jefes pueden gestionar puntos de venta.</p>
          <p><small>Usuario actual: {user?.role || user?.rol} - {user?.nombre}</small></p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Gestión de Puntos de Venta</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Nuevo Punto de Venta
        </button>
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

      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          {puntosVenta.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                <h5>No hay puntos de venta configurados</h5>
                <p>Haz clic en "Nuevo Punto de Venta" para crear el primero.</p>
              </div>
            </div>
          ) : (
            puntosVenta.map(punto => (
              <div key={punto._id} className="col-md-6 col-lg-4 mb-3">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">{punto.nombre}</h5>
                    <div>
                      <button 
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleEdit(punto)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(punto._id, punto.nombre)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {punto.descripcion && (
                      <p className="card-text text-muted">{punto.descripcion}</p>
                    )}
                    
                    <h6>Localidades asignadas:</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {punto.localidades.map(localidad => (
                        <span key={localidad} className="badge bg-secondary">
                          {localidad}
                        </span>
                      ))}
                    </div>
                    
                    <div className="mt-3">
                      <small className="text-muted">
                        Creado por: {punto.creadoPor?.name || 'Usuario'}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal para crear/editar punto de venta */}
      {showModal && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingPunto ? 'Editar Punto de Venta' : 'Nuevo Punto de Venta'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCloseModal}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="nombre" className="form-label">
                      Nombre del Punto de Venta *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="descripcion" className="form-label">
                      Descripción
                    </label>
                    <textarea
                      className="form-control"
                      id="descripcion"
                      rows="2"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Localidades Asignadas *</label>
                    {loadingLocalidades ? (
                      <div className="text-center">
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Cargando localidades...</span>
                        </div>
                        <small className="ms-2">Obteniendo localidades del CSV...</small>
                      </div>
                    ) : localidadesDisponibles.length === 0 ? (
                      <div className="alert alert-warning mb-0">
                        <small>No se encontraron localidades. Asegúrate de haber importado el CSV.</small>
                      </div>
                    ) : (
                      <div className="row">
                        {localidadesDisponibles.map(localidad => (
                          <div key={localidad} className="col-md-6 mb-2">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`localidad-${localidad}`}
                                checked={formData.localidades.includes(localidad)}
                                onChange={() => handleLocalidadChange(localidad)}
                              />
                              <label className="form-check-label" htmlFor={`localidad-${localidad}`}>
                                {localidad}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.localidades.length === 0 && (
                      <small className="text-danger d-block mt-2">
                        Debe seleccionar al menos una localidad
                      </small>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCloseModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!formData.nombre.trim() || formData.localidades.length === 0}
                  >
                    {editingPunto ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuntosVenta;
