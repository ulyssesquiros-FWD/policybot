import React from 'react';

/**
 * BrandLogo - Logotipo Original de PolicyBot HR
 * Diseño geométrico, minimalista y contemporáneo.
 * Simboliza la intersección entre el potencial humano y el núcleo de inteligencia artificial.
 */
export default function BrandLogo({
  size = 'md',
  theme = 'dark',
  showText = true,
  className = ''
}) {
  const dimensions = {
    sm: { icon: 24, text: 'text-sm', mark: 'h-6' },
    md: { icon: 32, text: 'text-base', mark: 'h-8' },
    lg: { icon: 44, text: 'text-xl', mark: 'h-11' },
    xl: { icon: 56, text: 'text-2xl', mark: 'h-14' }
  }[size] || { icon: 32, text: 'text-base', mark: 'h-8' };

  const isDark = theme === 'dark';
  const primaryStroke = isDark ? '#FFFFFF' : '#101114';
  const accentColor = '#2878FF';
  const textColor = isDark ? '#FFFFFF' : '#101114';
  const subtextColor = isDark ? '#86868B' : '#6E6E73';

  return (
    <div className={`brand-logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', userSelect: 'none' }}>
      <svg
        width={dimensions.icon}
        height={dimensions.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, transition: 'transform 0.3s ease' }}
      >
        {/* Anillo exterior de precisión geométrica con gradiente suave */}
        <circle
          cx="24"
          cy="24"
          r="21.5"
          stroke={primaryStroke}
          strokeWidth="1.5"
          strokeOpacity={isDark ? '0.18' : '0.12'}
        />

        {/* Arco continuo que forma la silueta orgánica humana y la 'P' estilizada */}
        <path
          d="M17 33V15C17 15 21 12 27 12C33 12 36 16 36 21C36 26.5 31.5 29 26 29H17"
          stroke={primaryStroke}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Nodo de inteligencia artificial (núcleo tecnológico) */}
        <circle
          cx="25.5"
          cy="20.5"
          r="3.5"
          fill={accentColor}
        />

        {/* Haz de luz de conexión sutil */}
        <circle
          cx="25.5"
          cy="20.5"
          r="6.5"
          stroke={accentColor}
          strokeWidth="1"
          strokeOpacity="0.35"
        />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            <span
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                fontSize: size === 'sm' ? '0.95rem' : size === 'lg' ? '1.35rem' : size === 'xl' ? '1.75rem' : '1.15rem',
                color: textColor
              }}
            >
              POLICYBOT
            </span>
            <span
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
                fontWeight: 600,
                letterSpacing: '0.08em',
                fontSize: size === 'sm' ? '0.7rem' : size === 'lg' ? '0.95rem' : size === 'xl' ? '1.15rem' : '0.8rem',
                color: accentColor
              }}
            >
              HR
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
