import React from 'react';
import { useAuth } from '../Hooks/useAuth';
import { Shield, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Navbar({ title, subtitle }) {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN_RRHH';

  // Extraer el primer nombre para el saludo editorial
  const firstName = user?.nombreCompleto?.split(' ')[0] || 'Ulysses';

  return (
    <header className="app-navbar">
      {/* Título o Saludo Editorial */}
      <div className="navbar-title-wrap">
        <h1 className="navbar-title">
          {isAdmin ? `Welcome back, ${firstName}.` : (title || 'PolicyBot HR')}
        </h1>
        <p className="navbar-subtitle">
          {isAdmin ? 'Your organization, intelligently connected.' : (subtitle || 'TicoTech S.A. • Costa Rica')}
        </p>
      </div>

      {/* Badges de Estado y Salud del Sistema */}
      <div className="navbar-badges">
        {/* Qdrant Status */}
        <div className="status-pill" title="Servidor Qdrant v1.20.2 activo en 127.0.0.1:6333 (1024d Cosine)">
          <span className="status-dot active" />
          <span>Qdrant 1024d</span>
        </div>

        {/* MySQL ORM Status */}
        <div className="status-pill" title="MySQL policybot_rrhh conectado mediante Sequelize ORM">
          <span className="status-dot active" />
          <span>MySQL ORM</span>
        </div>

        {/* DeepSeek Status */}
        <div className="status-pill" title="DeepSeek API activa con razonamiento">
          <Sparkles size={12} color="#2878FF" />
          <span>deepseek-flash</span>
        </div>

        {/* Role Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.85rem',
            borderRadius: '980px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: isAdmin ? 'rgba(40, 120, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)',
            color: isAdmin ? '#2878FF' : '#1D1D1F',
            border: isAdmin ? '1px solid rgba(40, 120, 255, 0.25)' : '1px solid rgba(0, 0, 0, 0.08)'
          }}
        >
          <Shield size={12} />
          <span>{user?.rol || 'COLABORADOR'}</span>
        </div>
      </div>
    </header>
  );
}
