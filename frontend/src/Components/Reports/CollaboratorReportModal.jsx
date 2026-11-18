import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Download,
  Printer,
  AlertTriangle,
  Check,
  Calendar,
  Award,
  Activity,
  MessageSquareText,
  Briefcase,
  Mail,
  UserCheck,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../Services/api';
import { downloadJsonFile, getEstadoStyle, getInitials } from './exportHelpers';

export default function CollaboratorReportModal({
  colaboradorId,
  autoAnalyze = false,
  onClose,
  onRequestResolved
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [focus, setFocus] = useState('INTEGRAL');
  const [activeSection, setActiveSection] = useState('solicitudes');
  const [actionMessage, setActionMessage] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/reports/collaborators/${colaboradorId}`);
      setReport(res.data.report);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el reporte individual del colaborador.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (selectedFocus = focus) => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post(`/reports/collaborators/${colaboradorId}/analyze`, {
        focus: selectedFocus
      });
      setAiAnalysis(res.data.analysis);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo generar el análisis IA del colaborador.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!colaboradorId) return;
    setAiAnalysis(null);
    setActionMessage('');
    fetchReport();
    if (autoAnalyze) {
      handleAnalyze('INTEGRAL');
    }
  }, [colaboradorId]);

  const handleResolvePending = async (solId, estado) => {
    try {
      await api.patch(`/employee/admin/requests/${solId}`, {
        estado,
        comentario: `${estado} desde Dossier Individual 360° de RRHH.`
      });
      setActionMessage(`Solicitud #${solId} marcada como ${estado}.`);
      await fetchReport();
      if (onRequestResolved) onRequestResolved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error resolviendo solicitud.');
    }
  };

  if (!colaboradorId) return null;

  const col = report?.colaborador;
  const kpis = report?.kpisIndividuales;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 17, 20, 0.58)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{
          background: '#F5F5F7',
          borderRadius: 26,
          width: '100%',
          maxWidth: 1080,
          maxHeight: '92vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.32)',
          border: '1px solid rgba(255, 255, 255, 0.25)'
        }}
      >
        {/* Top Sheet Header */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="avatar-badge" style={{ width: 48, height: 48, fontSize: '1.05rem' }}>
              {col ? getInitials(col.nombreCompleto) : '360'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1D1D1F', margin: 0, letterSpacing: '-0.02em' }}>
                  {col ? col.nombreCompleto : 'Cargando expediente...'}
                </h2>
                {col && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: 980,
                      background: getEstadoStyle(col.estado).bg,
                      color: getEstadoStyle(col.estado).color
                    }}
                  >
                    {col.estado}
                  </span>
                )}
              </div>
              {col && (
                <div style={{ fontSize: '0.8rem', color: '#6E6E73', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  <span><strong>{col.codigo_empleado}</strong></span>
                  <span>• {col.puesto}</span>
                  <span>• {col.departamento}</span>
                  <span>• Modalidad {col.modalidad}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {report && (
              <>
                <button
                  type="button"
                  className="btn-apple-secondary-light"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem' }}
                  onClick={() => downloadJsonFile({ report, aiAnalysis }, `reporte_${col.codigo_empleado}.json`)}
                >
                  <Download size={14} /> JSON
                </button>
                <button
                  type="button"
                  className="btn-apple-secondary-light"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem' }}
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Imprimir
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#F5F5F7',
                color: '#1D1D1F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Cerrar reporte"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#86868B' }}>
              <RefreshCw size={22} style={{ marginBottom: '0.75rem', color: '#2878FF' }} />
              <div>Construyendo reporte individual 360° desde MySQL ORM...</div>
            </div>
          ) : error && !report ? (
            <div className="apple-card" style={{ color: '#d7261e', textAlign: 'center' }}>
              {error}
            </div>
          ) : (
            <>
              {error && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(255, 69, 58, 0.1)', color: '#d7261e', fontSize: '0.84rem' }}>
                  {error}
                </div>
              )}

              {actionMessage && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(48, 209, 88, 0.12)', color: '#1b7d36', fontSize: '0.84rem', fontWeight: 500 }}>
                  {actionMessage}
                </div>
              )}

              {/* Metadata Ficha */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '1rem 1.25rem',
                  border: '1px solid rgba(0,0,0,0.06)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.85rem',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={15} color="#2878FF" />
                  <div>
                    <div style={{ color: '#86868B', fontSize: '0.7rem', textTransform: 'uppercase' }}>Correo Corporativo</div>
                    <strong style={{ color: '#1D1D1F' }}>{col.correo}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={15} color="#2878FF" />
                  <div>
                    <div style={{ color: '#86868B', fontSize: '0.7rem', textTransform: 'uppercase' }}>Jefatura Directa</div>
                    <strong style={{ color: '#1D1D1F' }}>
                      {col.jefe_nombre ? `${col.jefe_nombre} ${col.jefe_apellidos}` : 'Dirección Ejecutiva'}
                    </strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={15} color="#2878FF" />
                  <div>
                    <div style={{ color: '#86868B', fontSize: '0.7rem', textTransform: 'uppercase' }}>Ingreso &amp; Antigüedad</div>
                    <strong style={{ color: '#1D1D1F' }}>
                      {String(col.fecha_ingreso).slice(0, 10)} ({kpis.antiguedadTexto})
                    </strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={15} color="#2878FF" />
                  <div>
                    <div style={{ color: '#86868B', fontSize: '0.7rem', textTransform: 'uppercase' }}>Próxima Evaluación</div>
                    <strong style={{ color: '#1D1D1F' }}>{String(col.proxima_evaluacion).slice(0, 10)}</strong>
                  </div>
                </div>
              </div>

              {/* Alertas Normativas */}
              {kpis.alertas?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {kpis.alertas.map((al, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 12,
                        background:
                          al.nivel === 'ALTA'
                            ? 'rgba(255, 69, 58, 0.1)'
                            : al.nivel === 'MEDIA'
                            ? 'rgba(255, 149, 0, 0.12)'
                            : 'rgba(40, 120, 255, 0.1)',
                        color: al.nivel === 'ALTA' ? '#d7261e' : al.nivel === 'MEDIA' ? '#b26500' : '#1B67EC',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontWeight: 500
                      }}
                    >
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      <span>
                        <strong>[{al.codigo}]</strong> {al.mensaje}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 4 KPIs Individuales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
                <div className="apple-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Vacaciones Disponibles</span>
                    <Calendar size={15} color="#2878FF" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: kpis.excedeTope20Dias ? '#FF9500' : '#1D1D1F', letterSpacing: '-0.03em' }}>
                    {kpis.diasVacacionesDisponibles.toFixed(1)} d
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#86868B', marginTop: '0.25rem' }}>
                    {kpis.diasVacacionesAcumulados.toFixed(1)} acumulados • Uso: {kpis.tasaUtilizacionVacacionesPct}%
                  </div>
                </div>

                <div className="apple-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Desempeño OKR</span>
                    <Award size={15} color="#30D158" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#30D158', letterSpacing: '-0.03em' }}>
                    {kpis.scoreDesempeno.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#86868B', marginTop: '0.25rem' }}>
                    Nivel: {kpis.nivelDesempeno} (escala 1-5)
                  </div>
                </div>

                <div className="apple-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Incapacidades</span>
                    <Activity size={15} color="#FF453A" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.03em' }}>
                    {kpis.diasIncapacidadAcumulados} d
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#86868B', marginTop: '0.25rem' }}>
                    {kpis.totalIncapacidades} boleta(s) • {kpis.incapacidadActiva ? '1 Activa' : 'Sin activas'}
                  </div>
                </div>

                <div className="apple-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Consultas PolicyBot</span>
                    <MessageSquareText size={15} color="#2878FF" />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.03em' }}>
                    {kpis.totalConsultasChat}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#86868B', marginTop: '0.25rem' }}>
                    Confianza prom: {kpis.confianzaPromedioChatPct}% • {kpis.escalamientosTotal} escal.
                  </div>
                </div>
              </div>

              {/* Módulo de Análisis IA Individual */}
              <div
                className="apple-card"
                style={{
                  padding: '1.4rem',
                  borderLeft: '4px solid #2878FF',
                  background: '#FFFFFF'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} color="#2878FF" />
                    <strong style={{ fontSize: '0.95rem', color: '#1D1D1F' }}>Análisis Inteligente del Colaborador (DeepSeek-V3)</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select
                      className="apple-input"
                      style={{ width: 170, padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}
                      value={focus}
                      onChange={(e) => setFocus(e.target.value)}
                    >
                      <option value="INTEGRAL">Enfoque Integral</option>
                      <option value="VACACIONES">Riesgo Vacaciones</option>
                      <option value="DESEMPENO">Desempeño OKR</option>
                      <option value="AUSENTISMO">Ausentismo Médico</option>
                    </select>
                    <button
                      type="button"
                      className="btn-apple-primary"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                      onClick={() => handleAnalyze(focus)}
                      disabled={analyzing}
                    >
                      <Sparkles size={14} /> {analyzing ? 'Analizando expediente...' : 'Generar Análisis IA'}
                    </button>
                  </div>
                </div>

                {aiAnalysis ? (
                  <div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem', lineHeight: 1.65, color: '#1D1D1F', background: '#F5F5F7', padding: '1rem 1.15rem', borderRadius: 12 }}>
                      {aiAnalysis.analisisEjecutivo}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#86868B', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Modelo: {aiAnalysis.modeloIa} • Enfoque: {aiAnalysis.focus}</span>
                      <span>Latencia: {aiAnalysis.latenciaMs} ms</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.84rem', color: '#86868B' }}>
                    Presione <strong>"Generar Análisis IA"</strong> para que el Agente Analista de Reportes evalúe automáticamente el historial, alertas normativas y recomendaciones para este colaborador.
                  </div>
                )}
              </div>

              {/* Sub-navegación de tablas del expediente */}
              <div className="apple-card" style={{ padding: '1.4rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.75rem' }}>
                  {[
                    { id: 'solicitudes', label: `Solicitudes (${report.solicitudes?.length || 0})` },
                    { id: 'incapacidades', label: `Incapacidades (${report.incapacidades?.length || 0})` },
                    { id: 'movimientos', label: `Movimientos (${report.movimientos?.length || 0})` },
                    { id: 'chats', label: `Consultas Chat (${report.consultasChat?.length || 0})` }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSection(tab.id)}
                      style={{
                        padding: '0.4rem 0.9rem',
                        borderRadius: 980,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: activeSection === tab.id ? '#101114' : '#F5F5F7',
                        color: activeSection === tab.id ? '#FFFFFF' : '#6E6E73'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeSection === 'solicitudes' && (
                  <div style={{ overflowX: 'auto' }}>
                    {report.solicitudes?.length === 0 ? (
                      <div style={{ color: '#86868B', fontSize: '0.85rem', padding: '1rem 0' }}>Sin solicitudes registradas.</div>
                    ) : (
                      <table className="apple-table">
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>Período</th>
                            <th>Días</th>
                            <th>Motivo</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'right' }}>Acción RRHH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.solicitudes.map((s) => (
                            <tr key={s.id}>
                              <td><strong>{s.tipo}</strong></td>
                              <td>{String(s.fecha_inicio).slice(0, 10)} → {String(s.fecha_fin).slice(0, 10)}</td>
                              <td>{s.dias_solicitados} d</td>
                              <td style={{ maxWidth: 260, fontSize: '0.82rem', color: '#6E6E73' }}>{s.motivo}</td>
                              <td>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 980, background: getEstadoStyle(s.estado).bg, color: getEstadoStyle(s.estado).color }}>
                                  {s.estado}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {s.estado === 'PENDIENTE' ? (
                                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleResolvePending(s.id, 'APROBADA')}
                                      style={{ padding: '0.25rem 0.6rem', borderRadius: 6, background: '#30D158', color: '#FFF', fontSize: '0.74rem', fontWeight: 600 }}
                                    >
                                      <Check size={12} /> Aprobar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleResolvePending(s.id, 'RECHAZADA')}
                                      style={{ padding: '0.25rem 0.6rem', borderRadius: 6, background: 'rgba(255,69,58,0.12)', color: '#d7261e', fontSize: '0.74rem', fontWeight: 600 }}
                                    >
                                      Rechazar
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#86868B' }}>Resuelta</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeSection === 'incapacidades' && (
                  <div style={{ overflowX: 'auto' }}>
                    {report.incapacidades?.length === 0 ? (
                      <div style={{ color: '#86868B', fontSize: '0.85rem', padding: '1rem 0' }}>Sin incapacidades registradas.</div>
                    ) : (
                      <table className="apple-table">
                        <thead>
                          <tr>
                            <th>Boleta</th>
                            <th>Entidad</th>
                            <th>Tipo</th>
                            <th>Período</th>
                            <th>Días</th>
                            <th>Subsidio Patrono / Entidad</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.incapacidades.map((inc) => (
                            <tr key={inc.id}>
                              <td><code>{inc.numero_boleta}</code></td>
                              <td><strong>{inc.entidad_emisora}</strong></td>
                              <td>{inc.tipo_incapacidad}</td>
                              <td>{String(inc.fecha_inicio).slice(0, 10)} → {String(inc.fecha_fin).slice(0, 10)}</td>
                              <td>{inc.dias_incapacidad} d</td>
                              <td>{inc.porcentaje_subsidio_patrono}% / {inc.porcentaje_subsidio_entidad}%</td>
                              <td>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: 980, background: getEstadoStyle(inc.estado).bg, color: getEstadoStyle(inc.estado).color }}>
                                  {inc.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeSection === 'movimientos' && (
                  <div style={{ overflowX: 'auto' }}>
                    {report.movimientos?.length === 0 ? (
                      <div style={{ color: '#86868B', fontSize: '0.85rem', padding: '1rem 0' }}>Sin movimientos de personal registrados.</div>
                    ) : (
                      <table className="apple-table">
                        <thead>
                          <tr>
                            <th>Fecha Efectiva</th>
                            <th>Tipo Movimiento</th>
                            <th>Detalle Puesto / Depto</th>
                            <th>Motivo</th>
                            <th>Autorizado Por</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.movimientos.map((mov) => (
                            <tr key={mov.id}>
                              <td>{String(mov.fecha_efectiva).slice(0, 10)}</td>
                              <td><strong>{mov.tipo_movimiento}</strong></td>
                              <td style={{ fontSize: '0.8rem', color: '#6E6E73' }}>
                                <ArrowRightLeft size={12} style={{ marginRight: 4 }} />
                                {mov.puesto_nuevo || mov.departamento_nuevo || 'Registro organizacional'}
                              </td>
                              <td style={{ fontSize: '0.82rem' }}>{mov.motivo}</td>
                              <td style={{ fontSize: '0.8rem', color: '#6E6E73' }}>{mov.autorizado_por}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeSection === 'chats' && (
                  <div style={{ overflowX: 'auto' }}>
                    {report.consultasChat?.length === 0 ? (
                      <div style={{ color: '#86868B', fontSize: '0.85rem', padding: '1rem 0' }}>Sin consultas en PolicyBot registradas.</div>
                    ) : (
                      <table className="apple-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Pregunta</th>
                            <th>Agente</th>
                            <th>Confianza</th>
                            <th>Escalada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.consultasChat.map((ch) => (
                            <tr key={ch.id}>
                              <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#86868B' }}>
                                {String(ch.created_at).slice(0, 16).replace('T', ' ')}
                              </td>
                              <td style={{ maxWidth: 340, fontSize: '0.82rem' }}>{ch.pregunta}</td>
                              <td><span style={{ fontSize: '0.75rem', color: '#2878FF', fontWeight: 600 }}>{ch.agente_primario}</span></td>
                              <td>{Math.round(Number(ch.confianza || 0) * 100)}%</td>
                              <td>{ch.escalada ? 'Sí' : 'No'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
