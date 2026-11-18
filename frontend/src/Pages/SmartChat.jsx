import React, { useEffect, useState, useRef } from 'react';
import {
  Send,
  Bot,
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  History,
  X,
  Sparkles,
  ArrowUp,
  Cpu,
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../Services/api';
import { useAuth } from '../Hooks/useAuth';
import CitationBadge from '../Components/CitationBadge';
import ConfidenceIndicator from '../Components/ConfidenceIndicator';

export default function SmartChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: `Hola ${user?.nombreCompleto || 'Colaborador'}. Soy PolicyBot HR, tu asistente de inteligencia artificial con arquitectura multiagente LangGraph. Puedo responder consultas precisas sobre las políticas laborales de TicoTech S.A. y el Código de Trabajo de Costa Rica con citas directas verificables, o consultar tu expediente personal autorizado con estricto aislamiento de privacidad.`,
      primaryAgent: 'Agente Orquestador',
      confidence: 1,
      confidenceLabel: 'ALTA',
      citations: []
    }
  ]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [docModal, setDocModal] = useState(null);
  const [escalateFeedback, setEscalateFeedback] = useState('');
  const [showHistory, setShowHistory] = useState(true);
  const endRef = useRef(null);

  const loadHistory = async () => {
    try {
      const res = await api.get('/chat/history');
      setHistory(res.data.history || []);
    } catch {
      // Silencioso en carga inicial
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const suggestions = [
    '¿Cuántos días de vacaciones corresponden por ley y por política interna?',
    '¿Cuál es mi saldo actual de vacaciones disponibles?',
    '¿Tengo suficientes días disponibles según la política para pedir 5 días de vacaciones?',
    '¿Cómo se pagan los primeros 3 días de incapacidad por enfermedad común?',
    '¿Cuántos días de licencia de paternidad me corresponden?',
    ...(user?.rol === 'ADMIN_RRHH'
      ? ['¿Cuál es la tasa de rotación trimestral y cuántas solicitudes pendientes hay?']
      : ['¿Cuántos días de vacaciones tiene María Vargas? (Prueba privacidad)'])
  ];

  const handleSend = async (customText) => {
    const q = (customText ?? input).trim();
    if (!q || sending) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput('');
    setSending(true);
    setEscalateFeedback('');

    try {
      const res = await api.post('/chat/query', { question: q });
      const data = res.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          consultaId: data.consultaId,
          question: q,
          text: data.answer,
          primaryAgent: data.primaryAgent,
          agentsInvoked: data.agentsInvoked,
          citations: data.citations || [],
          confidence: data.confidence,
          confidenceLabel: data.confidenceLabel,
          validation: data.validation,
          shouldEscalate: data.shouldEscalate,
          escalationTicket: data.escalationTicket,
          blocked: data.blocked,
          latencyMs: data.latencyMs
        }
      ]);
      loadHistory();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'bot',
          text: err.response?.data?.error || 'Error procesando su consulta en la red multiagente.',
          primaryAgent: 'Sistema',
          confidence: 0,
          confidenceLabel: 'BAJA',
          citations: []
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleOpenDocument = async (documentId) => {
    try {
      const res = await api.get(`/documents/view/${documentId}`);
      setDocModal(res.data);
    } catch {
      setDocModal({
        document: { document_name: documentId, document_id: documentId },
        content: 'No se pudo cargar la vista previa del documento.'
      });
    }
  };

  const handleEscalateManual = async (msg) => {
    try {
      const res = await api.post('/chat/escalate', {
        consultaId: msg.consultaId,
        question: msg.question || msg.text,
        motivo: 'Escalamiento formal solicitado por el colaborador para revisión de RRHH.'
      });
      setEscalateFeedback(`Ticket de escalamiento creado exitosamente: ${res.data.ticket.ticket_codigo}`);
    } catch (err) {
      setEscalateFeedback(err.response?.data?.error || 'No se pudo crear el ticket de escalamiento.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'calc(100vh - 120px)', minHeight: 650 }}>
      {/* Studio Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: '#101114',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={14} />
            </span>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: '#101114', letterSpacing: '-0.02em', margin: 0 }}>
              Intelligence Studio
            </h1>
            <span
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: 999,
                background: 'rgba(40, 120, 255, 0.1)',
                color: '#2878FF',
                fontSize: '0.7rem',
                fontWeight: 600
              }}
            >
              LangGraph Multi-Agent
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#86868B', margin: 0 }}>
            Consultas en lenguaje natural con citas documentales rigurosas de Google Drive y lectura relacional directa en MySQL.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-apple-secondary-light"
            onClick={() => setShowHistory(!showHistory)}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <History size={14} /> {showHistory ? 'Ocultar historial' : 'Ver historial'}
          </button>
        </div>
      </div>

      {escalateFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 12,
            background: 'rgba(52, 199, 89, 0.1)',
            border: '1px solid rgba(52, 199, 89, 0.25)',
            color: '#1b7d36',
            fontSize: '0.82rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={16} /> {escalateFeedback}
        </motion.div>
      )}

      {/* Main Studio Canvas Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: showHistory ? '280px 1fr' : '1fr', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        {/* Left Column: History & Quick Discovery */}
        {showHistory && (
          <aside
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0
            }}
          >
            <div
              style={{
                padding: '1rem 1.15rem',
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#101114', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={14} color="#86868B" /> Consultas Previas
              </span>
              <span style={{ fontSize: '0.72rem', color: '#86868B', fontWeight: 500 }}>
                {history.length} registradas
              </span>
            </div>

            <div style={{ overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1 }}>
              {history.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#86868B' }}>
                  Sin consultas previas en esta sesión.
                </div>
              ) : (
                history.slice(0, 25).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => handleSend(h.pregunta)}
                    style={{
                      textAlign: 'left',
                      padding: '0.65rem 0.8rem',
                      borderRadius: 10,
                      border: '1px solid transparent',
                      background: '#F5F5F7',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#E5E5EA';
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F5F5F7';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        color: '#101114',
                        fontSize: '0.78rem',
                        marginBottom: '0.2rem',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {h.pregunta}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#86868B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: '#2878FF', fontWeight: 600 }}>{h.agente_primario || 'Orquestador'}</span>
                      {h.tema_principal && <span>· {h.tema_principal}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Right Column: Chat Stream & Interactive Prompter */}
        <section
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0
          }}
        >
          {/* Quick suggestions header pills */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
              background: '#FAFAFC',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}
          >
            <span style={{ fontSize: '0.72rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Sugerencias:
            </span>
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(sug)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 999,
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.74rem',
                  color: '#101114',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2878FF';
                  e.currentTarget.style.color = '#2878FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.color = '#101114';
                }}
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              background: '#FBFBFD'
            }}
          >
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '100%'
                }}
              >
                {m.role === 'user' ? (
                  /* User Bubble: Deep Graphite Apple Style */
                  <div
                    style={{
                      maxWidth: '75%',
                      background: '#101114',
                      color: '#FFFFFF',
                      padding: '0.85rem 1.25rem',
                      borderRadius: '20px 20px 4px 20px',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {m.text}
                  </div>
                ) : (
                  /* Bot Card: Editorial White Card with Border */
                  <div
                    style={{
                      maxWidth: '85%',
                      background: '#FFFFFF',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '20px 20px 20px 4px',
                      padding: '1.25rem',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Bot Header Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: 999,
                          background: 'rgba(40, 120, 255, 0.1)',
                          color: '#2878FF',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        <Bot size={13} /> {m.primaryAgent || 'PolicyBot HR'}
                      </span>
                      <ConfidenceIndicator confidence={m.confidence} label={m.confidenceLabel} />
                      {m.blocked && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: 999,
                            background: 'rgba(255, 59, 48, 0.12)',
                            color: '#d7261e',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}
                        >
                          <AlertTriangle size={13} /> Bloqueo Seguridad/Gobernanza
                        </span>
                      )}
                      {m.latencyMs > 0 && (
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 999,
                            background: '#F5F5F7',
                            color: '#86868B',
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        >
                          {m.latencyMs} ms
                        </span>
                      )}
                    </div>

                    {/* Answer text */}
                    <div
                      style={{
                        fontSize: '0.91rem',
                        lineHeight: 1.65,
                        color: '#101114',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {m.text}
                    </div>

                    {/* Citations section */}
                    {m.citations && m.citations.length > 0 && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#86868B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <ShieldCheck size={14} color="#34C759" /> Citas Documentales Verificables ({m.citations.length})
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                          {m.citations.map((cit, i) => (
                            <CitationBadge key={i} citation={cit} onOpenDocument={handleOpenDocument} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Escalation ticket banner */}
                    {m.escalationTicket && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(255, 149, 0, 0.08)',
                          border: '1px solid rgba(255, 149, 0, 0.25)',
                          borderRadius: 12,
                          fontSize: '0.82rem',
                          color: '#b26500'
                        }}
                      >
                        <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Escalamiento Automático a Dirección de RRHH:</strong>
                        Se ha generado el ticket formal <code>{m.escalationTicket.ticket_codigo}</code> para revisión humana prioritaria.
                      </div>
                    )}

                    {/* Footer metadata & escalation CTA */}
                    {m.id !== 'welcome' && !m.escalationTicket && (
                      <div
                        style={{
                          marginTop: '0.4rem',
                          paddingTop: '0.65rem',
                          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        {m.agentsInvoked && m.agentsInvoked.length > 0 ? (
                          <span style={{ fontSize: '0.72rem', color: '#86868B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Cpu size={12} /> Flujo LangGraph: {m.agentsInvoked.join(' → ')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#86868B' }}>
                            Verificado con DeepSeek-V3
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn-apple-secondary-light"
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleEscalateManual(m)}
                        >
                          <LifeBuoy size={13} /> Escalar a RRHH
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Pulsing indicator when sending */}
            {sending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 16,
                  background: '#FFFFFF',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  width: 'fit-content',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#2878FF' }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2, ease: 'easeInOut' }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#2878FF' }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4, ease: 'easeInOut' }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#2878FF' }}
                  />
                </div>
                <span style={{ fontSize: '0.78rem', color: '#86868B', fontWeight: 500 }}>
                  Orquestando grafo multiagente y consultando Qdrant...
                </span>
              </motion.div>
            )}

            <div ref={endRef} />
          </div>

          {/* Frosted Floating Input Bar */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid rgba(0, 0, 0, 0.06)',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#F5F5F7',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: 999,
                padding: '0.4rem 0.5rem 0.4rem 1.25rem',
                transition: 'all 0.2s ease',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre vacaciones, incapacidades, aguinaldo o consulta tu expediente..."
                disabled={sending}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: '#101114',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: input.trim() && !sending ? '#101114' : '#E5E5EA',
                  color: input.trim() && !sending ? '#FFFFFF' : '#86868B',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !sending ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                <ArrowUp size={18} />
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Document Inspector Modal (Apple Sheet Style) */}
      <AnimatePresence>
        {docModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{
                background: '#FFFFFF',
                borderRadius: 24,
                width: '100%',
                maxWidth: 720,
                maxHeight: '85vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(0, 0, 0, 0.08)'
              }}
            >
              <div
                style={{
                  padding: '1.25rem 1.75rem',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#FAFAFC'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#101114' }}>
                    {docModal.document.document_name}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
                    Código: <code>{docModal.document.document_id}</code> · Versión {docModal.document.version || '1.0'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#F5F5F7',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#101114'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1, background: '#FFFFFF' }}>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    lineHeight: 1.65,
                    color: '#101114',
                    margin: 0,
                    background: '#F5F5F7',
                    padding: '1.25rem',
                    borderRadius: 14,
                    border: '1px solid rgba(0, 0, 0, 0.06)'
                  }}
                >
                  {docModal.content}
                </pre>
              </div>

              <div
                style={{
                  padding: '1rem 1.75rem',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: '#FAFAFC'
                }}
              >
                <button
                  type="button"
                  className="btn-apple-primary"
                  onClick={() => setDocModal(null)}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.84rem' }}
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
