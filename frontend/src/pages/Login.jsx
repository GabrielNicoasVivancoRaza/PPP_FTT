import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';
import { FTT_LOGO } from '../assets/fttLogo';

const Login = () => {
  const [formData, setFormData] = useState({
    usuario: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verPassword, setVerPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login(formData);
      
      if (response.user.primerAcceso) {
        await Swal.fire({
          title: '¡Bienvenido!',
          text: 'Debes cambiar tu contraseña antes de continuar',
          icon: 'info',
          confirmButtonText: 'Cambiar Contraseña'
        });
        navigate('/change-password');
      } else {
        // La redirección según el/los rol(es) del usuario la resuelve
        // RoleBasedRedirect (soporta que tenga más de un rol a la vez)
        navigate('/', { replace: true });
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100">
        <Col xs={12} sm={8} md={6} lg={4} className="mx-auto">
          <Card className="shadow">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <img src={FTT_LOGO} alt="FeelTheTickets" height="56" onError={(e)=>{e.currentTarget.style.display='none'}} />
                <h2 className="h4 mb-1 fw-semibold text-celeste">FeelTheTickets — Canje</h2>
                <p className="text-muted">Accede para gestionar canjes y tickets</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="usuario"
                    value={formData.usuario}
                    onChange={handleChange}
                    placeholder="usuario@ejemplo.com"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Contraseña</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={verPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Contraseña"
                      required
                      disabled={loading}
                    />
                    <Button
                      variant="outline-secondary"
                      type="button"
                      onClick={() => setVerPassword(v => !v)}
                      disabled={loading}
                      title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <i className={verPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                    </Button>
                  </InputGroup>
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    variant="dark" 
                    type="submit" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
