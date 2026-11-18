import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import BrandLogo from '../Components/BrandLogo';
import { useAuth } from '../Hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.includes('@') || password.length < 6) {
      setError('Ingrese un correo corporativo válido y su contraseña correspondiente.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      if (user.rol === 'ADMIN_RRHH') navigate('/hr-admin');
      else if (user.rol === 'AUDITOR') navigate('/governance');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible iniciar sesión. Verifique sus credenciales.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#101114',
        color: '#FFFFFF'
      }}
    >
      {/* Columna Izquierda: Composición Cinematográfica Visual */}
      <div
        className="login-cinematic-col"
        style={{
          flex: '1.2',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '4rem',
          overflow: 'hidden',
          backgroundColor: '#0D0E12'
        }}
      >
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=85"
          alt="TicoTech Headquarters"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.4) contrast(1.15)'
          }}
        />

        {/* Gradiente Cinematográfico */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(16, 17, 20, 0.4) 0%, rgba(16, 17, 20, 0.9) 100%)'
          }}
        />

        {/* Contenido Superior */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#86868B', fontSize: '0.875rem', transition: 'color 0.2s' }}>
            <ArrowLeft size={16} />
            <span>Volver al inicio</span>
          </Link>
        </div>

        {/* Cita Editorial Central */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '540px' }}>
          <div style={{ width: '40px', height: '2px', backgroundColor: '#2878FF', marginBottom: '1.5rem' }} />
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
              color: '#FFFFFF'
            }}
          >
            "Human Resources. Reimagined with Intelligence."
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#86868B', lineHeight: 1.6 }}>
            Acceso seguro a expedientes, políticas de Costa Rica y analítica operativa para la organización TicoTech S.A.
          </p>
        </div>

        {/* Badge Inferior */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#30D158' }} />
          <span style={{ fontSize: '0.8rem', color: '#86868B' }}>
            Protección de Identidad bajo Ley N° 8968 &amp; Cifrado AES-256-GCM
          </span>
        </div>
      </div>

      {/* Columna Derecha: Formulario Minimalista Apple Style */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem 5rem',
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo */}
          <div style={{ marginBottom: '2.5rem' }}>
            <BrandLogo size="lg" theme="dark" showText={true} />
          </div>

          {/* Titular */}
          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              marginBottom: '0.5rem',
              color: '#FFFFFF'
            }}
          >
            Acceso a la plataforma
          </h1>
          <p style={{ color: '#86868B', fontSize: '1rem', marginBottom: '2.5rem' }}>
            Ingrese sus credenciales corporativas para continuar.
          </p>

          {/* Alerta de Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'rgba(255, 69, 58, 0.12)',
                border: '1px solid rgba(255, 69, 58, 0.25)',
                color: '#FF453A',
                padding: '0.85rem 1.15rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                marginBottom: '1.75rem'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#86868B',
                  marginBottom: '0.5rem'
                }}
              >
                Correo Corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#86868B" style={{ position: 'absolute', left: 16, top: 16 }} />
                <input
                  type="email"
                  className="apple-input-dark"
                  style={{ paddingLeft: '3rem', height: '52px' }}
                  placeholder="usuario@policybot.cr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#86868B',
                  marginBottom: '0.5rem'
                }}
              >
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#86868B" style={{ position: 'absolute', left: 16, top: 16 }} />
                <input
                  type="password"
                  className="apple-input-dark"
                  style={{ paddingLeft: '3rem', height: '52px' }}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Botón Principal */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-apple-primary"
              style={{
                height: '52px',
                fontSize: '1rem',
                marginTop: '1rem',
                width: '100%',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <span>{submitting ? 'Autenticando...' : 'Iniciar Sesión'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Accesos Rápidos de Demostración */}
          <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
              Cuentas de Demostración Verificadas
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => fillDemo('ana.mora@policybot.cr', 'AdminRRHH2026!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    Ulysses Quirós
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#86868B' }}>
                    Principal Administrator • ana.mora@policybot.cr
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#2878FF', fontWeight: 600 }}>Cargar</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('carlos.rojas@policybot.cr', 'Colab2026!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    Carlos Rojas Jiménez
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#86868B' }}>
                    Colaborador Senior • carlos.rojas@policybot.cr
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#2878FF', fontWeight: 600 }}>Cargar</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .login-cinematic-col {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
