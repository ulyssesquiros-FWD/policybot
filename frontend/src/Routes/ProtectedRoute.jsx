import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Verificando sesión autenticada...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
