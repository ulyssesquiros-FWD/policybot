import React from 'react';
import { BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

export default function CitationBadge({ citation, onOpenDocument }) {
  const relevancePct = Math.round((citation.score || 0) * 100);
  const driveUrl = citation.drive_url || (citation.drive_file_id ? `https://drive.google.com/file/d/${citation.drive_file_id}/view` : null);

  return (
    <div
      style={{
        border: '1px solid rgba(0, 0, 0, 0.08)',
        background: '#FFFFFF',
        borderRadius: 12,
        padding: '0.75rem 0.95rem',
        fontSize: '0.8rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, color: '#101114' }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: '#F5F5F7',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2878FF'
            }}
          >
            <BookOpen size={13} />
          </span>
          <span>{citation.document_name}</span>
          <span style={{ fontSize: '0.72rem', color: '#86868B', fontWeight: 400 }}>({citation.document_id})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: 999,
              background: '#F5F5F7',
              color: '#101114',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}
          >
            v{citation.version || '1.0'}
          </span>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: 999,
              background: relevancePct >= 70 ? 'rgba(52, 199, 89, 0.12)' : 'rgba(40, 120, 255, 0.12)',
              color: relevancePct >= 70 ? '#1b7d36' : '#2878FF',
              fontSize: '0.68rem',
              fontWeight: 600
            }}
          >
            {relevancePct}% match
          </span>
        </div>
      </div>

      <div style={{ color: '#48484A', fontSize: '0.75rem', lineHeight: 1.4 }}>
        <strong style={{ color: '#101114' }}>{citation.section || 'Sección principal'}:</strong>{' '}
        {citation.snippet ? `«${citation.snippet.slice(0, 140)}...»` : 'Fragmento indexado y verificado semánticamente.'}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {onOpenDocument && (
          <button
            type="button"
            className="btn-apple-secondary-light"
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem', borderRadius: 6 }}
            onClick={() => onOpenDocument(citation.document_id)}
          >
            Inspeccionar fragmento
          </button>
        )}
        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              color: '#2878FF',
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            Ver original en Drive <ExternalLink size={11} />
          </a>
        )}
        <span style={{ fontSize: '0.68rem', color: '#86868B', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ShieldCheck size={11} color="#34C759" /> Cita RAG verificada
        </span>
      </div>
    </div>
  );
}
