import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { ticketService } from '../services';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await ticketService.getStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
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
