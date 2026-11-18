import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from './Routes/ProtectedRoute';
import Sidebar from './Components/Sidebar';
import Navbar from './Components/Navbar';
import Login from './Pages/Login';
import LandingPage from './Pages/LandingPage';
import EmployeeDashboard from './Pages/EmployeeDashboard';
import SmartChat from './Pages/SmartChat';
import HrAdminDashboard from './Pages/HrAdminDashboard';
import DocumentAdmin from './Pages/DocumentAdmin';
import GovernanceAudit from './Pages/GovernanceAudit';

function AppLayout({ title, subtitle, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Navbar title={title} subtitle={subtitle} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout title="Dashboard del Colaborador">
                  <EmployeeDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <AppLayout title="Chat Inteligente Multiagente">
                  <SmartChat />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/hr-admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_RRHH']}>
                <AppLayout title="Dashboard Administrativo RRHH">
                  <HrAdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/documents"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_RRHH']}>
                <AppLayout title="Administración Documental y RAG">
                  <DocumentAdmin />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/governance"
            element={
              <ProtectedRoute allowedRoles={['ADMIN_RRHH', 'AUDITOR']}>
                <AppLayout title="Gobernanza de IA y Auditoría">
                  <GovernanceAudit />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
