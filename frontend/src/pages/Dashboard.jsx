import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import { ticketService } from '../services';

ChartJS.register(ArcElement, BarElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const FILTROS_VACIOS = { fechaInicio: '', fechaFin: '', puntoTrabajo: '' };

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [puntosDisponibles, setPuntosDisponibles] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_VACIOS);

  const fetchStats = useCallback(async (params, guardarOpcionesDePunto) => {
    try {
      setLoading(true);
      const query = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v)
      );
      const response = await ticketService.getStats(query);
      setStats(response.stats);
      // La lista de puntos de trabajo del filtro se arma una sola vez, sin
      // filtros aplicados, para que no se achique a medida que se filtra.
      if (guardarOpcionesDePunto) {
        const puntos = (response.stats.ticketsPorPunto || [])
          .map(p => p._id)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'es'));
        setPuntosDisponibles(puntos);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(FILTROS_VACIOS, true);
  }, [fetchStats]);

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setFiltrosAplicados(filtros);
    fetchStats(filtros, false);
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_VACIOS);
    setFiltrosAplicados(FILTROS_VACIOS);
    fetchStats(FILTROS_VACIOS, false);
  };

  const hayFiltrosActivos = Object.values(filtrosAplicados).some(Boolean);

  const donutData = {
    labels: ['Canjeados', 'Pendientes'],
    datasets: [
      {
        data: stats ? [stats.ticketsCanjeados, stats.ticketsRestantes] : [0, 0],
        backgroundColor: ['#28a745', '#ffc107'],
        borderColor: ['#1e7e34', '#e0a800'],
        borderWidth: 2,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Estado de Tickets',
      },
    },
  };

  const lineData = {
    labels: stats?.evolucionDiaria?.map(item => item._id) || [],
    datasets: [
      {
        label: 'Tickets Entregados',
        data: stats?.evolucionDiaria?.map(item => item.count) || [],
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.1,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Evolución Diaria de Entregas',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const usuariosOrdenados = [...(stats?.ticketsPorUsuario || [])].sort((a, b) => b.count - a.count);

  const usuariosData = {
    labels: usuariosOrdenados.map(u => u.nombre),
    datasets: [
      {
        label: 'Entradas canjeadas',
        data: usuariosOrdenados.map(u => u.count),
        backgroundColor: '#6f42c1',
        borderColor: '#59339d',
        borderWidth: 1,
      },
    ],
  };

  const usuariosOptions = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Canjes por Usuario' },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  const horaData = {
    labels: (stats?.ticketsPorHora || []).map(h => `${String(h.hora).padStart(2, '0')}:00`),
    datasets: [
      {
        label: 'Entradas canjeadas',
        data: (stats?.ticketsPorHora || []).map(h => h.count),
        backgroundColor: '#20c997',
        borderColor: '#17a67e',
        borderWidth: 1,
      },
    ],
  };

  const horaOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Canjes por Hora del Día' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  const horaPico = (stats?.ticketsPorHora || []).reduce(
    (max, h) => (h.count > (max?.count || 0) ? h : max),
    null
  );
  const usuarioTop = usuariosOrdenados[0];

  if (loading && !stats) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <h2>Dashboard</h2>
        </Col>
      </Row>

      {/* Filtros interactivos */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Form onSubmit={aplicarFiltros}>
                <Row className="align-items-end g-3">
                  <Col md={3}>
                    <Form.Label>Desde</Form.Label>
                    <Form.Control
                      type="date"
                      value={filtros.fechaInicio}
                      onChange={e => setFiltros(f => ({ ...f, fechaInicio: e.target.value }))}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Hasta</Form.Label>
                    <Form.Control
                      type="date"
                      value={filtros.fechaFin}
                      onChange={e => setFiltros(f => ({ ...f, fechaFin: e.target.value }))}
                    />
                  </Col>
                  <Col md={3}>
                    <Form.Label>Punto de trabajo</Form.Label>
                    <Form.Select
                      value={filtros.puntoTrabajo}
                      onChange={e => setFiltros(f => ({ ...f, puntoTrabajo: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {puntosDisponibles.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={3} className="d-flex gap-2">
                    <Button type="submit" variant="primary" disabled={loading}>
                      Aplicar
                    </Button>
                    <Button type="button" variant="outline-secondary" onClick={limpiarFiltros} disabled={loading || !hayFiltrosActivos}>
                      Limpiar
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Estadísticas generales */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-primary">{stats?.totalTickets || 0}</h3>
              <p className="mb-0">Total Tickets</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-success">{stats?.ticketsCanjeados || 0}</h3>
              <p className="mb-0">Canjeados</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-warning">{stats?.ticketsRestantes || 0}</h3>
              <p className="mb-0">Pendientes</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-info">{stats?.porcentajeCanjeados?.toFixed(1) || 0}%</h3>
              <p className="mb-0">% Canjeados</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* KPIs derivados de las nuevas métricas */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="text-center">
            <Card.Body>
              <h3 className="text-purple" style={{ color: '#6f42c1' }}>{usuarioTop?.nombre || '—'}</h3>
              <p className="mb-0">Usuario más activo{usuarioTop ? ` (${usuarioTop.count} canjes)` : ''}</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="text-center">
            <Card.Body>
              <h3 style={{ color: '#20c997' }}>
                {horaPico ? `${String(horaPico.hora).padStart(2, '0')}:00` : '—'}
              </h3>
              <p className="mb-0">Hora pico{horaPico ? ` (${horaPico.count} canjes)` : ''}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gráficos */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Doughnut data={donutData} options={donutOptions} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Line data={lineData} options={lineOptions} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Bar data={usuariosData} options={usuariosOptions} />
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Bar data={horaData} options={horaOptions} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tickets por punto de trabajo */}
      {stats?.ticketsPorPunto && stats.ticketsPorPunto.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Tickets por Punto de Trabajo</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  {stats.ticketsPorPunto.map((punto, index) => (
                    <Col md={4} key={index} className="mb-3">
                      <Card className="text-center">
                        <Card.Body>
                          <h4 className="text-primary">{punto.count}</h4>
                          <p className="mb-0">{punto._id || 'Sin asignar'}</p>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Dashboard;
