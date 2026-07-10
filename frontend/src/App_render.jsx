import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketsPage from './pages/TicketsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import ChangePassword from './pages/ChangePassword';
import PuntosVenta from './pages/PuntosVenta';
import ImpresionPage from './pages/ImpresionPage';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Error Boundary for route errors
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route error:', error, errorInfo);
    // Redirect to home on route error
    window.location.href = '/';
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5 text-center">
          <h3>Redirigiendo...</h3>
          <script>{`window.location.href = '/';`}</script>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <RouteErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
              <Routes>
                {/* Rutas públicas */}
                <Route path="/login" element={<Login />} />
                
                {/* Rutas protegidas */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <RoleBasedRedirect />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute roles={['jefe']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/puntos-venta" 
                  element={
                    <ProtectedRoute roles={['jefe']}>
                      <PuntosVenta />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/tickets" 
                  element={
                    <ProtectedRoute roles={['staff', 'jefe']}>
                      <TicketsPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/users" 
                  element={
                    <ProtectedRoute roles={['jefe']}>
                      <UsersPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/audit" 
                  element={
                    <ProtectedRoute roles={['jefe']}>
                      <AuditPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/impresion" 
                  element={
                    <ProtectedRoute roles={['impresor', 'jefe']}>
                      <ImpresionPage />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/change-password" 
                  element={
                    <ProtectedRoute>
                      <ChangePassword />
                    </ProtectedRoute>
                  } 
                />

                {/* Catch all route - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </RouteErrorBoundary>
  );
}

export default App;
