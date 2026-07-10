import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import Unauthorized from './components/Unauthorized';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketsPage from './pages/TicketsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import ChangePassword from './pages/ChangePassword';
import PuntosVenta from './pages/PuntosVenta';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
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
                  <ProtectedRoute roles={['jefe', 'staff']}>
                    <TicketsPage />
                  </ProtectedRoute>
                }
              />              <Route 
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
                path="/change-password" 
                element={
                  <ProtectedRoute>
                    <ChangePassword />
                  </ProtectedRoute>
                } 
              />

              {/* Página de no autorizado */}
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Página 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
  );
}

export default App;
