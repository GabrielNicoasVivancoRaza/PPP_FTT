import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ScanSessionProvider } from './context/ScanSessionContext';
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
import PrinterSettingsPage from './pages/PrinterSettingsPage';
import PrintQueuePage from './pages/PrintQueuePage';
import ImpresosPage from './pages/ImpresosPage';
import ImportCsvPage from './pages/ImportCsvPage';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// Carga diferida: trae las librerías de escaneo (@zxing/browser, qrcode)
// solo cuando alguien visita /escanearTicket, para no inflar el bundle
// principal que descargan todos los usuarios en cada carga de la app.
const ScanTicketPage = lazy(() => import('./pages/ScanTicketPage'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScanSessionProvider>
        <Layout>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<Login />} />

              {/* Ruta del escáner: pública a propósito. El modo "celular"
                  (?sesion=...) no requiere sesión iniciada; el modo
                  computadora valida auth/rol dentro del propio componente. */}
              <Route
                path="/escanearTicket"
                element={
                  <Suspense fallback={
                    <div className="d-flex justify-content-center mt-5">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Cargando...</span>
                      </div>
                    </div>
                  }>
                    <ScanTicketPage />
                  </Suspense>
                }
              />
              
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
                  <ProtectedRoute roles={['jefe', 'staff', 'impresor_solo']}>
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
                path="/impresion-config"
                element={
                  <ProtectedRoute roles={['jefe']}>
                    <PrinterSettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cola-impresion"
                element={
                  <ProtectedRoute roles={['jefe', 'impresor_cola']}>
                    <PrintQueuePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/impresos"
                element={
                  <ProtectedRoute roles={['jefe', 'impresor_cola']}>
                    <ImpresosPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/importar-csv"
                element={
                  <ProtectedRoute roles={['jefe', 'importador']}>
                    <ImportCsvPage />
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
        </ScanSessionProvider>
        </Router>
      </AuthProvider>
  );
}

export default App;
