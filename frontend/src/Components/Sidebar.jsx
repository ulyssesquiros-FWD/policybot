import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareText,
  BarChart3,
  FileText,
  ShieldCheck,
  LogOut,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../Hooks/useAuth';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'ADMIN_RRHH';
  const isAuditor = user?.rol === 'AUDITOR';

  // Obtener iniciales dinámicamente del nombre del usuario autenticado
  const getInitials = (fullName) => {
    if (!fullName) return 'PB';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user?.nombreCompleto);

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/dashboard" style={{ display: 'inline-block' }}>
          <BrandLogo size="md" theme="dark" showText={true} />
        </NavLink>
        <div style={{ fontSize: '0.72rem', color: '#86868B', marginTop: '0.4rem', letterSpacing: '0.02em' }}>
          TicoTech S.A. • Enterprise AI
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="sidebar-nav">
        <div style={{ fontSize: '0.7rem', color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.5rem 0.75rem', fontWeight: 600 }}>
          Colaborador
        </div>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} className="sidebar-icon" />
          <span>Mi Portal</span>
        </NavLink>

        <NavLink
          to="/chat"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <MessageSquareText size={18} className="sidebar-icon" />
          <span>Chat Inteligente</span>
        </NavLink>

        {/* Administration Links */}
        {isAdmin && (
          <>
            <div style={{ fontSize: '0.7rem', color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1rem 0.75rem 0.5rem', fontWeight: 600 }}>
              Administración
            </div>

            <NavLink
              to="/hr-admin"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <BarChart3 size={18} className="sidebar-icon" />
              <span>Reportes &amp; Analítica</span>
            </NavLink>

            <NavLink
              to="/documents"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <FileText size={18} className="sidebar-icon" />
              <span>Documentos &amp; RAG</span>
            </NavLink>
          </>
        )}

        {/* Governance Links */}
        {(isAdmin || isAuditor) && (
          <>
            <div style={{ fontSize: '0.7rem', color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '1rem 0.75rem 0.5rem', fontWeight: 600 }}>
              Cumplimiento
            </div>

            <NavLink
              to="/governance"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <ShieldCheck size={18} className="sidebar-icon" />
              <span>Gobernanza &amp; Auditoría</span>
            </NavLink>
          </>
        )}

        {/* Enlace a Landing Page Pública */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <NavLink
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link"
            style={{ color: '#86868B', fontSize: '0.85rem' }}
          >
            <ExternalLink size={16} />
            <span>Ver Landing Pública</span>
          </NavLink>
        </div>
      </nav>

      {/* User Profile Card at Bottom */}
      <div className="sidebar-user-card">
        {/* Avatar Minimalista Elegante */}
        <div className="avatar-badge" title={user?.nombreCompleto}>
          {initials}
        </div>

        {/* Metadata de Usuario */}
        <div className="user-meta">
          <div className="user-name" title={user?.nombreCompleto}>
            {user?.nombreCompleto || 'Ulysses Quirós'}
          </div>
          <div className="user-role" title={user?.puesto}>
            {user?.puesto || 'Principal Administrator'}
          </div>
        </div>

        {/* Botón de Salir */}
        <button
          type="button"
          onClick={logout}
          className="btn-logout"
          title="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
