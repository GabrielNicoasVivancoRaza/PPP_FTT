import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import './SchedulePage.css';

const SchedulePage = () => {
  const [schedules, setSchedules] = useState([]);
  const [collections, setCollections] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState(['FechaUno']); // Ahora es array
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCollections();
    fetchSchedules();
  }, [currentMonth]);

  const fetchCollections = async () => {
    try {
      const response = await api.get('/schedule/collections');
      if (response.data.success) {
        setCollections(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando colecciones:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        .toISOString().split('T')[0];
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const response = await api.get(`/schedule?startDate=${startDate}&endDate=${endDate}`);
      
      if (response.data.success) {
        setSchedules(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando cronograma:', error);
    }
  };

  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };
  
  // Toggle selección de colección
  const toggleCollection = (collectionId) => {
    if (selectedCollections.includes(collectionId)) {
      // Desmarcar solo si hay más de 1 seleccionada
      if (selectedCollections.length > 1) {
        setSelectedCollections(selectedCollections.filter(c => c !== collectionId));
      }
    } else {
      setSelectedCollections([...selectedCollections, collectionId]);
    }
  };

  const handleSaveSchedule = async () => {
    if (selectedDates.length === 0) {
      setError('Selecciona al menos una fecha');
      return;
    }
    
    if (selectedCollections.length === 0) {
      setError('Selecciona al menos una colección');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/schedule', {
        fechas: selectedDates,
        colecciones: selectedCollections // Enviar array de colecciones
      });

      if (response.data.success) {
        const colsText = selectedCollections.length > 1 
          ? `${selectedCollections.length} colecciones` 
          : selectedCollections[0];
        setSuccess(`${selectedDates.length} fecha(s) asignadas a ${colsText}`);
        setSelectedDates([]);
        fetchSchedules();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al guardar cronograma');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (selectedDates.length === 0) {
      setError('Selecciona al menos una fecha para eliminar');
      return;
    }

    if (!confirm(`¿Eliminar ${selectedDates.length} fecha(s) del cronograma?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.delete('/schedule', {
        data: { fechas: selectedDates }
      });

      if (response.data.success) {
        setSuccess(`${response.data.data.deletedCount} fecha(s) eliminadas`);
        setSelectedDates([]);
        fetchSchedules();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al eliminar fechas');
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.find(s => s.fecha === dateStr);
  };

  const getCollectionColor = (collectionName) => {
    const collection = collections.find(c => c.id === collectionName);
    return collection?.color || '#6c757d';
  };
  
  // Contar cuántas fechas tiene cada colección asignada
  const getCollectionStats = (collectionId) => {
    return schedules.filter(s => s.coleccion === collectionId).length;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Domingo anterior
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 semanas
      const date = new Date(currentDate);
      const dateStr = date.toISOString().split('T')[0];
      const schedule = getScheduleForDate(date);
      const isCurrentMonth = date.getMonth() === month;
      const isSelected = selectedDates.includes(dateStr);
      const isToday = date.toDateString() === new Date().toDateString();
      
      // Obtener colecciones del schedule
      const colecciones = schedule?.colecciones || (schedule?.coleccion ? [schedule.coleccion] : []);
      
      days.push(
        <div
          key={i}
          className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDateClick(date)}
          style={{
            backgroundColor: schedule ? getCollectionColor(colecciones[0]) + '22' : '',
            borderColor: isSelected ? '#0d6efd' : schedule ? getCollectionColor(colecciones[0]) : '#dee2e6',
            borderWidth: schedule ? '2px' : '1px'
          }}
        >
          <div className="day-number">{date.getDate()}</div>
          {schedule && colecciones.length > 0 && (
            <div className="mt-1 d-flex flex-column gap-1">
              {colecciones.map((col, idx) => (
                <Badge 
                  key={idx}
                  bg="light" 
                  text="dark"
                  className="w-100"
                  style={{ 
                    backgroundColor: getCollectionColor(col),
                    color: 'white',
                    fontSize: '0.55rem',
                    padding: '1px 3px',
                    borderRadius: '3px'
                  }}
                >
                  {col === 'FechaUno' && '🎵 F1'}
                  {col === 'FechaDos' && '🎸 F2'}
                  {col === 'FechaTres' && '🎤 F3'}
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">📅 Cronograma de Bases de Datos</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Button variant="outline-primary" size="sm" onClick={previousMonth}>◀</Button>
              <h5 className="mb-0">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h5>
              <Button variant="outline-primary" size="sm" onClick={nextMonth}>▶</Button>
            </Card.Header>
            <Card.Body>
              <div className="calendar-weekdays">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="weekday-name">{day}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {renderCalendar()}
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h6 className="mb-0">📋 Leyenda de Colecciones</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex flex-column gap-2">
                {collections.map(collection => {
                  const count = getCollectionStats(collection.id);
                  return (
                    <div 
                      key={collection.id}
                      className="d-flex align-items-center p-2 rounded"
                      style={{ 
                        backgroundColor: collection.color + '15',
                        border: `2px solid ${collection.color}`
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>
                        {collection.id === 'FechaUno' && '🎵'}
                        {collection.id === 'FechaDos' && '🎸'}
                        {collection.id === 'FechaTres' && '🎤'}
                      </span>
                      <div className="flex-grow-1">
                        <div className="fw-bold" style={{ color: collection.color }}>
                          {collection.name}
                        </div>
                        <small className="text-muted">
                          {collection.description}
                        </small>
                      </div>
                      <Badge 
                        bg="secondary" 
                        pill
                        style={{ 
                          fontSize: '0.85rem',
                          minWidth: '30px'
                        }}
                      >
                        {count} {count === 1 ? 'día' : 'días'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <hr />
              <div className="small text-muted">
                <div className="mb-1">
                  <span className="badge bg-warning text-dark">Hoy</span> = Fecha actual
                </div>
                <div className="mb-1">
                  <span className="badge bg-primary">Seleccionada</span> = Fecha seleccionada
                </div>
                <div>
                  <span style={{ opacity: 0.3 }}>Gris</span> = Otro mes
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">⚙️ Asignar Fechas</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <label className="form-label fw-bold">Seleccionar Colecciones: (puedes elegir varias)</label>
                <div className="d-flex flex-column gap-2">
                  {collections.map(collection => (
                    <div 
                      key={collection.id}
                      className="form-check p-2 rounded"
                      style={{
                        backgroundColor: selectedCollections.includes(collection.id) 
                          ? collection.color + '20' 
                          : 'transparent',
                        border: `2px solid ${selectedCollections.includes(collection.id) ? collection.color : '#dee2e6'}`,
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleCollection(collection.id)}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={selectedCollections.includes(collection.id)}
                        onChange={() => toggleCollection(collection.id)}
                        id={`collection-${collection.id}`}
                        style={{ cursor: 'pointer' }}
                      />
                      <label 
                        className="form-check-label ms-2" 
                        htmlFor={`collection-${collection.id}`}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <span style={{ fontSize: '1.1rem', marginRight: '6px' }}>
                          {collection.id === 'FechaUno' && '🎵'}
                          {collection.id === 'FechaDos' && '🎸'}
                          {collection.id === 'FechaTres' && '🎤'}
                        </span>
                        <strong>{collection.name}</strong>
                        <br />
                        <small className="text-muted">{collection.description}</small>
                      </label>
                    </div>
                  ))}
                </div>
                <small className="text-muted mt-2 d-block">
                  💡 Puedes asignar varias colecciones al mismo día para permitir canje de múltiples fechas
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Fechas Seleccionadas:</label>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {selectedDates.length === 0 ? (
                    <p className="text-muted small">Haz clic en el calendario para seleccionar fechas</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {selectedDates.sort().map(date => (
                        <Badge 
                          key={date} 
                          bg="primary"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))}
                        >
                          {new Date(date + 'T12:00:00').toLocaleDateString('es-ES')} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="d-grid gap-2">
                <Button
                  variant="success"
                  onClick={handleSaveSchedule}
                  disabled={loading || selectedDates.length === 0}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : '💾 Guardar Asignación'}
                </Button>

                <Button
                  variant="danger"
                  onClick={handleDeleteSchedule}
                  disabled={loading || selectedDates.length === 0}
                >
                  {loading ? <Spinner animation="border" size="sm" /> : '🗑️ Eliminar Fechas'}
                </Button>

                <Button
                  variant="outline-secondary"
                  onClick={() => setSelectedDates([])}
                  disabled={selectedDates.length === 0}
                >
                  ✕ Limpiar Selección
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Header>
              <h6 className="mb-0">ℹ️ Instrucciones</h6>
            </Card.Header>
            <Card.Body>
              <ol className="small mb-0">
                <li>Selecciona una base de datos</li>
                <li>Haz clic en las fechas del calendario (puedes seleccionar múltiples)</li>
                <li>Haz clic en "Guardar Asignación"</li>
                <li>Las fechas se colorearán según la base asignada</li>
                <li>Para eliminar, selecciona fechas y haz clic en "Eliminar Fechas"</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SchedulePage;
