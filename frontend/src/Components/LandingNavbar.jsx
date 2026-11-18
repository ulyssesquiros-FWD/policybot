import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: scrolled ? 'rgba(16, 17, 20, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
        padding: scrolled ? '0.75rem 2rem' : '1.25rem 2rem'
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <BrandLogo size="md" theme="dark" showText={true} />
        </Link>

        {/* Center Desktop Navigation Links */}
        <div
          className="desktop-nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2.25rem'
          }}
        >
          {[
            { label: 'Producto', target: 'experiencia' },
            { label: 'Agentes IA', target: 'agentes' },
            { label: 'Tecnología', target: 'tecnologia' },
            { label: 'Métricas', target: 'metricas' },
            { label: 'Seguridad', target: 'seguridad' }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => scrollToSection(item.target)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#86868B',
                fontSize: '0.875rem',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => (e.target.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.target.style.color = '#86868B')}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Right CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/login')}
            className="btn-apple-primary"
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.875rem' }}
          >
            <span>Iniciar sesión</span>
            <ArrowRight size={14} />
          </button>

          {/* Mobile hamburger */}
          <button
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              color: '#FFFFFF',
              display: 'none',
              padding: '0.5rem'
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(16, 17, 20, 0.98)',
            backdropFilter: 'blur(25px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {[
            { label: 'Producto', target: 'experiencia' },
            { label: 'Agentes IA', target: 'agentes' },
            { label: 'Tecnología', target: 'tecnologia' },
            { label: 'Métricas', target: 'metricas' },
            { label: 'Seguridad', target: 'seguridad' }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => scrollToSection(item.target)}
              style={{
                textAlign: 'left',
                color: '#FFFFFF',
                fontSize: '1.1rem',
                fontWeight: 500,
                padding: '0.5rem 0'
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => navigate('/login')}
              className="btn-apple-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav-links {
            display: none !important;
          }
          .mobile-hamburger {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
}
