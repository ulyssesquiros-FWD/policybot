import React from 'react';

export default function ConfidenceIndicator({ confidence, label }) {
  const pct = Math.round((Number(confidence) || 0) * 100);
  const isHigh = pct >= 80;
  const isMed = pct >= 55 && pct < 80;

  const bg = isHigh ? 'rgba(52, 199, 89, 0.12)' : isMed ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 59, 48, 0.12)';
  const color = isHigh ? '#1b7d36' : isMed ? '#b26500' : '#d7261e';
  const dotColor = isHigh ? '#34C759' : isMed ? '#FF9500' : '#FF3B30';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.6rem',
        borderRadius: 999,
        background: bg,
        color: color,
        fontSize: '0.7rem',
        fontWeight: 600,
        letterSpacing: '0.01em'
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: dotColor
        }}
      />
      Confianza {label || (isHigh ? 'ALTA' : isMed ? 'MEDIA' : 'BAJA')} ({pct}%)
    </span>
  );
}
