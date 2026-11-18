import React from 'react';

export default function KpiCard({ title, value, subtitle, icon: Icon, tone = 'blue' }) {
  const toneMap = {
    blue: { bg: 'rgba(40, 120, 255, 0.1)', color: '#2878FF' },
    green: { bg: 'rgba(52, 199, 89, 0.1)', color: '#1b7d36' },
    amber: { bg: 'rgba(255, 149, 0, 0.1)', color: '#b26500' },
    red: { bg: 'rgba(255, 59, 48, 0.1)', color: '#d7261e' }
  };
  const theme = toneMap[tone] || toneMap.blue;

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 18,
        padding: '1.35rem',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}
    >
      <div>
        <div style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </div>
        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.03em', margin: '0.2rem 0' }}>
          {value}
        </div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: '#86868B' }}>{subtitle}</div>}
      </div>
      {Icon && (
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: theme.bg,
            color: theme.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
