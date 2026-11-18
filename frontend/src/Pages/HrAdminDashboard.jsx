import React, { useEffect, useState } from 'react';
import {
  Users,
  Clock,
  Activity,
  TrendingUp,
  Bot,
  RefreshCw,
  Check,
  X,
  Sparkles,
  AlertCircle,
  FileText,
  BarChart3,
  Download,
  Printer,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../Services/api';
import { useAuth } from '../Hooks/useAuth';
import CollaboratorsDirectoryTab from '../Components/Reports/CollaboratorsDirectoryTab';
import DataAnalysisLabTab from '../Components/Reports/DataAnalysisLabTab';
import CollaboratorReportModal from '../Components/Reports/CollaboratorReportModal';
import { downloadJsonFile } from '../Components/Reports/exportHelpers';

const CHART_COLORS = ['#2878FF', '#101114', '#86868B', '#30D158', '#FF9500'];

export default function HrAdminDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [collabDataset, setCollabDataset] = useState({ total: 0, colaboradores: [], analytics: {} });
  const [activeTab, setActiveTab] = useState('general');
  const [modalState, setModalState] = useState({ id: null, autoAnalyze: false });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [ticketReply, setTicketReply] = useState({});

  const firstName = user?.nombreCompleto?.split(' ')[0] || 'Ulysses';

  const loadAll = async () => {
    setLoading(true);
    try {
      const [repRes, solRes, colabRes] = await Promise.all([
        api.get('/reports/latest'),
        api.get('/employee/admin/requests'),
        api.get('/reports/collaborators')
      ]);
      setDashboard(repRes.data);
      setSelectedReport(repRes.data.latestReport);
      setSolicitudes(solRes.data.solicitudes || []);
      setCollabDataset(colabRes.data || { total: 0, colaboradores: [], analytics: {} });
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Error cargando dashboard administrativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleGenerateNow = async () => {
    setGenerating(true);
    setFeedback('');
    try {
      const res = await api.post('/reports/generate');
      setFeedback(`Reporte diario #${res.data.report.id} generado y almacenado en MySQL reportes_diarios.`);
      await loadAll();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Error generando reporte.');
    } finally {
      setGenerating(false);
    }
  };

  const handleResolveRequest = async (id, estado) => {
    try {
      await api.patch(`/employee/admin/requests/${id}`, {
        estado,
        comentario: `${estado} por ${user?.nombreCompleto || 'Dirección de RRHH'} desde panel administrativo.`
      });
      setFeedback(`Solicitud #${id} resuelta como ${estado}.`);
      loadAll();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Error actualizando solicitud.');
    }
  };

  const handleResolveEscalation = async (id) => {
    try {
      await api.patch(`/reports/escalations/${id}`, {
        estado: 'RESUELTO',
        respuesta_rrhh: ticketReply[id] || `Atendido por ${user?.nombreCompleto || 'RRHH'}.`
      });
      setFeedback(`Ticket de escalamiento #${id} resuelto.`);
      loadAll();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Error resolviendo ticket.');
    }
  };

  const handleSelectReportHistory = (reportId) => {
    const found = (dashboard?.history || []).find((r) => Number(r.id) === Number(reportId));
    if (found) setSelectedReport(found);
  };

  const openIndividualReport = (colaboradorId, autoAnalyze = false) => {
    if (!colaboradorId) return;
    setModalState({ id: Number(colaboradorId), autoAnalyze });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#86868B' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={24} className="spin" style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem', color: '#2878FF' }} />
          <div>Cargando analítica ejecutiva, reportes y expedientes ORM...</div>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const m = selectedReport?.metricas_json || {};
  const historyList = dashboard?.history || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. Header Editorial Apple Pro */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2878FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            CENTRO DE REPORTES Y ANALÍTICA RRHH
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 600, letterSpacing: '-0.03em', color: '#1D1D1F', margin: '0.25rem 0' }}>
            Welcome back, {firstName}.
          </h2>
          <p style={{ color: '#6E6E73', fontSize: '1rem' }}>
            Your organization, intelligently connected. Reporte #{selectedReport?.id} ({String(selectedReport?.fecha_reporte || '').slice(0, 10)}) • {collabDataset.total || 55} colaboradores registrados
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {selectedReport && (
            <>
              <button
                type="button"
                className="btn-apple-secondary-light"
                onClick={() => downloadJsonFile(selectedReport, `reporte_rrhh_${selectedReport.id}.json`)}
                style={{ padding: '0.65rem 1.1rem', fontSize: '0.84rem' }}
              >
                <Download size={15} /> Exportar JSON
              </button>
              <button
                type="button"
                className="btn-apple-secondary-light"
                onClick={() => window.print()}
                style={{ padding: '0.65rem 1.1rem', fontSize: '0.84rem' }}
              >
                <Printer size={15} /> Imprimir
              </button>
            </>
          )}
          <button
            type="button"
            className="btn-apple-primary"
            onClick={handleGenerateNow}
            disabled={generating}
            style={{ padding: '0.7rem 1.45rem', fontSize: '0.88rem' }}
          >
            <RefreshCw size={15} className={generating ? 'spin' : ''} />
            <span>{generating ? 'Generando...' : 'Generar Reporte Diario'}</span>
          </button>
        </div>
      </div>

      {/* Apple Segmented Control Navigation */}
      <div
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          padding: '0.4rem',
          background: '#E5E5EA',
          borderRadius: 16,
          width: 'fit-content'
        }}
      >
        {[
          { id: 'general', label: 'Reporte Ejecutivo General', icon: FileText },
          { id: 'individual', label: `Reportes Individuales (${collabDataset.total || 55})`, icon: Users },
          { id: 'analysis', label: 'Laboratorio de Análisis de Datos & IA', icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: 12,
                fontSize: '0.86rem',
                fontWeight: isActive ? 600 : 500,
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#1D1D1F' : '#6E6E73',
                boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={15} color={isActive ? '#2878FF' : '#6E6E73'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            backgroundColor: 'rgba(48, 209, 88, 0.1)',
            border: '1px solid rgba(48, 209, 88, 0.25)',
            color: '#059669',
            padding: '0.9rem 1.35rem',
            borderRadius: '14px',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <Check size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: REPORTE EJECUTIVO GENERAL                                  */}
      {/* ================================================================= */}
      {activeTab === 'general' && (
        <>
          {/* Selector de Historial de Reportes */}
          <div
            className="apple-card"
            style={{
              padding: '1.15rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Calendar size={18} color="#2878FF" />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1D1D1F' }}>
                  Historial de Reportes Diarios ({historyList.length} almacenados en MySQL)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#86868B' }}>
                  Cron programado: {dashboard?.scheduler?.cronExpression} ({dashboard?.scheduler?.timezone})
                </div>
              </div>
            </div>

            <select
              className="apple-input"
              style={{ maxWidth: 380, padding: '0.55rem 0.9rem', fontSize: '0.84rem' }}
              value={selectedReport?.id || ''}
              onChange={(e) => handleSelectReportHistory(e.target.value)}
            >
              {historyList.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  Reporte #{rep.id} • {String(rep.fecha_reporte).slice(0, 10)} • {rep.generado_por}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Resumen Ejecutivo (Canvas Editorial Pro) */}
          <div
            className="apple-card"
            style={{
              borderLeft: '4px solid #2878FF',
              background: '#FFFFFF'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#2878FF" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1D1D1F' }}>
                  Resumen Ejecutivo de Tendencias Laborales (Reporte #{selectedReport?.id})
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#86868B', background: '#F5F5F7', padding: '0.3rem 0.75rem', borderRadius: '980px' }}>
                {selectedReport?.modelo_ia || 'DeepSeek'} • Latencia: {selectedReport?.latencia_ms || 0} ms
              </span>
            </div>

            <p style={{ fontSize: '1.03rem', color: '#1D1D1F', lineHeight: 1.65, fontWeight: 400 }}>
              {selectedReport?.resumen_ejecutivo || 'Analítica ejecutiva consolidada basada en las tablas relacionales de MySQL.'}
            </p>
          </div>

          {/* 3. Grand KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '1.25rem'
            }}
          >
            <div className="apple-card" style={{ padding: '1.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Colaboradores Activos
                </span>
                <Users size={16} color="#2878FF" />
              </div>
              <div className="kpi-big-number">{m.colaboradoresActivos ?? 55}</div>
              <div style={{ fontSize: '0.8rem', color: '#86868B', marginTop: '0.5rem' }}>
                Total histórico: {m.totalColaboradores ?? 55} en nómina
              </div>
            </div>

            <div className="apple-card" style={{ padding: '1.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Solicitudes Pendientes
                </span>
                <Clock size={16} color="#FF9500" />
              </div>
              <div className="kpi-big-number" style={{ color: (m.solicitudesPendientesTotal || 0) > 0 ? '#FF9500' : '#1D1D1F' }}>
                {m.solicitudesPendientesTotal ?? 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#86868B', marginTop: '0.5rem' }}>
                {m.solicitudesPendientesMas3Dias?.length ?? 0} superan 3 días de espera
              </div>
            </div>

            <div className="apple-card" style={{ padding: '1.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Incapacidades Activas
                </span>
                <Activity size={16} color="#FF453A" />
              </div>
              <div className="kpi-big-number">{m.incapacidadesActivasTotal ?? 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#86868B', marginTop: '0.5rem' }}>
                {m.incapacidadesMesTotal ?? 0} en el mes ({m.incapacidadesMesDias ?? 0} días)
              </div>
            </div>

            <div className="apple-card" style={{ padding: '1.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Rotación Trimestral
                </span>
                <TrendingUp size={16} color="#30D158" />
              </div>
              <div className="kpi-big-number">{m.tasaRotacionTrimestralPct ?? 0}%</div>
              <div style={{ fontSize: '0.8rem', color: '#86868B', marginTop: '0.5rem' }}>
                Ingresos: {m.movimientosUltimos3Meses?.ingresos ?? 0} · Salidas: {m.movimientosUltimos3Meses?.salidas ?? 0}
              </div>
            </div>

            <div className="apple-card" style={{ padding: '1.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Vacaciones &gt; 20 Días
                </span>
                <AlertCircle size={16} color="#FF9500" />
              </div>
              <div className="kpi-big-number" style={{ color: '#FF9500' }}>
                {m.vacacionesSuperiores20DiasTotal ?? 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#86868B', marginTop: '0.5rem' }}>
                Colaboradores sobre tope interno
              </div>
            </div>

            <div className="apple-card" style={{ padding: '1.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Resolución Chatbot
                </span>
                <Bot size={16} color="#30D158" />
              </div>
              <div className="kpi-big-number" style={{ color: '#30D158' }}>
                {m.chatbotResolucionSinEscalamientoPct ?? 100}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#86868B', marginTop: '0.5rem' }}>
                {m.chatbotConsultasTotal ?? 0} consultas • {m.chatbotLatenciaPromedioMs ?? 0} ms prom.
              </div>
            </div>
          </div>

          {/* 4. Gráficos Recharts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            <div className="apple-card">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86868B', marginBottom: '1.25rem' }}>
                1. Ausencias Actuales por Departamento
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={m.ausenciasActualesPorTipoYDepto || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="departamento" tick={{ fontSize: 10, fill: '#86868B' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#86868B' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#101114', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                    />
                    <Bar dataKey="total" fill="#2878FF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="apple-card">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#86868B', marginBottom: '1.25rem' }}>
                2. Top 5 Temas Consultados en PolicyBot
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={m.top5TemasConsultados || []}
                      dataKey="total"
                      nameKey="tema"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={3}
                      label={(entry) => `${entry.tema} (${entry.total})`}
                    >
                      {(m.top5TemasConsultados || []).map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#101114', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 5. Desglose de Indicadores Detallados del Reporte (Vacaciones > 20d, Incapacidades Activas, Pendientes > 3d) */}
          <div className="apple-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>
                  Colaboradores con Vacaciones Superiores a 20 Días ({m.vacacionesSuperiores20DiasDetalle?.length || 0})
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#6E6E73', margin: '0.2rem 0 0' }}>
                  Indicador #8 del reporte oficial (POL-VAC-001). Acceda directamente al reporte individual de cada colaborador.
                </p>
              </div>
              <button
                type="button"
                className="btn-apple-secondary-light"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                onClick={() => setActiveTab('individual')}
              >
                Ver los {collabDataset.total || 55} Colaboradores
              </button>
            </div>

            {(m.vacacionesSuperiores20DiasDetalle || []).length === 0 ? (
              <div style={{ color: '#86868B', fontSize: '0.86rem' }}>No hay colaboradores sobre 20 días de vacaciones en este reporte.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Colaborador</th>
                      <th>Departamento</th>
                      <th>Acumulados</th>
                      <th>Disponibles</th>
                      <th style={{ textAlign: 'right' }}>Expediente 360°</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.vacacionesSuperiores20DiasDetalle.map((v, idx) => (
                      <tr key={v.id || idx}>
                        <td><code>{v.codigo_empleado}</code></td>
                        <td><strong>{v.nombre} {v.apellidos}</strong></td>
                        <td>{v.departamento}</td>
                        <td>{Number(v.dias_acumulados || 0).toFixed(1)} d</td>
                        <td>
                          <span style={{ color: '#FF9500', fontWeight: 700 }}>
                            {Number(v.dias_disponibles || 0).toFixed(1)} d
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {v.id && (
                            <button
                              type="button"
                              className="btn-apple-secondary-light"
                              style={{ padding: '0.3rem 0.7rem', fontSize: '0.76rem', borderRadius: 8 }}
                              onClick={() => openIndividualReport(v.id, false)}
                            >
                              <FileText size={13} /> Ver Reporte Individual
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
            {/* Incapacidades Activas */}
            <div className="apple-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1D1D1F', marginBottom: '0.9rem' }}>
                Incapacidades Médicas Activas ({m.incapacidadesActivasDetalle?.length || 0})
              </h3>
              {(m.incapacidadesActivasDetalle || []).length === 0 ? (
                <div style={{ color: '#86868B', fontSize: '0.85rem' }}>Sin incapacidades activas al corte de este reporte.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Entidad / Boleta</th>
                        <th>Tipo</th>
                        <th>Días</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.incapacidadesActivasDetalle.map((inc) => (
                        <tr key={inc.id}>
                          <td>
                            <strong>{inc.nombre} {inc.apellidos}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#86868B' }}>{inc.departamento}</div>
                          </td>
                          <td>
                            <strong>{inc.entidad_emisora}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#86868B' }}>{inc.numero_boleta}</div>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>{inc.tipo_incapacidad}</td>
                          <td><strong>{inc.dias_incapacidad} d</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Solicitudes Pendientes > 3 días */}
            <div className="apple-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1D1D1F', marginBottom: '0.9rem' }}>
                Solicitudes con Más de 3 Días de Espera ({m.solicitudesPendientesMas3Dias?.length || 0})
              </h3>
              {(m.solicitudesPendientesMas3Dias || []).length === 0 ? (
                <div style={{ color: '#86868B', fontSize: '0.85rem' }}>No hay solicitudes atrasadas más de 3 días.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th>Colaborador</th>
                        <th>Tipo</th>
                        <th>Días Sol.</th>
                        <th>Espera</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.solicitudesPendientesMas3Dias.map((sp) => (
                        <tr key={sp.id}>
                          <td>
                            <strong>{sp.nombre} {sp.apellidos}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#86868B' }}>{sp.departamento}</div>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>{sp.tipo}</td>
                          <td>{sp.dias_solicitados} d</td>
                          <td>
                            <span style={{ color: '#FF453A', fontWeight: 700 }}>{sp.dias_espera} d</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 6. Tabla de Solicitudes Pendientes con Decisión Humana */}
          <div className="apple-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F' }}>
                  Gestión de Solicitudes Pendientes
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#6E6E73' }}>
                  Supervisión humana obligatoria. La IA no aprueba ni rechaza vacaciones de forma autónoma.
                </p>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#FF9500', backgroundColor: 'rgba(255, 149, 0, 0.1)', padding: '0.35rem 0.85rem', borderRadius: '980px', fontWeight: 600 }}>
                {solicitudes.filter((s) => s.estado === 'PENDIENTE').length} Pendientes
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="apple-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Departamento</th>
                    <th>Tipo &amp; Días</th>
                    <th>Período</th>
                    <th>Espera</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acción Humana</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.slice(0, 12).map((s) => {
                    const isOverdue = s.dias_espera > 3 && s.estado === 'PENDIENTE';
                    return (
                      <tr key={s.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => openIndividualReport(s.colaborador_id, false)}
                            style={{ textAlign: 'left' }}
                            title="Abrir reporte individual del colaborador"
                          >
                            <div style={{ fontWeight: 600, color: '#2878FF' }}>{s.nombre} {s.apellidos}</div>
                            <div style={{ fontSize: '0.75rem', color: '#86868B' }}>{s.codigo_empleado}</div>
                          </button>
                        </td>
                        <td>{s.departamento}</td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{s.tipo}</span>
                          <span style={{ color: '#86868B', fontSize: '0.8rem', marginLeft: '0.35rem' }}>({s.dias_solicitados}d)</span>
                        </td>
                        <td>
                          {String(s.fecha_inicio).slice(0, 10)} → {String(s.fecha_fin).slice(0, 10)}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              backgroundColor: isOverdue ? 'rgba(255, 69, 58, 0.12)' : 'rgba(0, 0, 0, 0.05)',
                              color: isOverdue ? '#FF453A' : '#6E6E73'
                            }}
                          >
                            {s.dias_espera} días
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.25rem 0.65rem',
                              borderRadius: '980px',
                              backgroundColor:
                                s.estado === 'APROBADA'
                                  ? 'rgba(48, 209, 88, 0.12)'
                                  : s.estado === 'RECHAZADA'
                                  ? 'rgba(255, 69, 58, 0.12)'
                                  : 'rgba(255, 149, 0, 0.12)',
                              color:
                                s.estado === 'APROBADA'
                                  ? '#30D158'
                                  : s.estado === 'RECHAZADA'
                                  ? '#FF453A'
                                  : '#FF9500'
                            }}
                          >
                            {s.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {s.estado === 'PENDIENTE' ? (
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => handleResolveRequest(s.id, 'APROBADA')}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '8px',
                                  backgroundColor: '#30D158',
                                  color: '#FFFFFF',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Check size={14} /> Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResolveRequest(s.id, 'RECHAZADA')}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(255, 69, 58, 0.1)',
                                  color: '#FF453A',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <X size={14} /> Rechazar
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#86868B' }}>Resuelto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Tickets de Escalamiento Humano */}
          {dashboard?.escalaciones?.length > 0 && (
            <div className="apple-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F' }}>
                    Casos Escalados por el Sistema RAG
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6E6E73' }}>
                    Consultas de colaboradores donde no existe evidencia suficiente en las políticas oficiales.
                  </p>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#AF52DE', backgroundColor: 'rgba(175, 82, 222, 0.1)', padding: '0.35rem 0.85rem', borderRadius: '980px', fontWeight: 600 }}>
                  {dashboard.escalaciones.filter((t) => t.estado === 'ABIERTO').length} Abiertos
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {dashboard.escalaciones.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      backgroundColor: '#F5F5F7',
                      border: '1px solid rgba(0,0,0,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2878FF' }}>{t.ticket_codigo}</span>
                        <span style={{ fontSize: '0.75rem', color: '#86868B' }}>• {t.categoria}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '980px',
                          backgroundColor: t.estado === 'ABIERTO' ? 'rgba(255, 149, 0, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                          color: t.estado === 'ABIERTO' ? '#FF9500' : '#30D158'
                        }}
                      >
                        {t.estado}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.925rem', color: '#1D1D1F', fontWeight: 500, marginBottom: '0.5rem' }}>
                      "{t.pregunta_original}"
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#6E6E73', marginBottom: '0.75rem' }}>
                      Motivo: {t.motivo_escalamiento}
                    </div>

                    {t.estado === 'ABIERTO' && (
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <input
                          type="text"
                          className="apple-input"
                          placeholder="Respuesta oficial de Recursos Humanos..."
                          style={{ height: '40px', fontSize: '0.85rem' }}
                          value={ticketReply[t.id] || ''}
                          onChange={(e) => setTicketReply({ ...ticketReply, [t.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => handleResolveEscalation(t.id)}
                          className="btn-apple-primary"
                          style={{ padding: '0 1.25rem', height: '40px', fontSize: '0.85rem', flexShrink: 0 }}
                        >
                          Responder y Cerrar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* TAB 2: REPORTES INDIVIDUALES POR COLABORADOR                      */}
      {/* ================================================================= */}
      {activeTab === 'individual' && (
        <CollaboratorsDirectoryTab
          colaboradores={collabDataset.colaboradores}
          onOpenReport={openIndividualReport}
        />
      )}

      {/* ================================================================= */}
      {/* TAB 3: LABORATORIO DE ANÁLISIS DE DATOS & IA                      */}
      {/* ================================================================= */}
      {activeTab === 'analysis' && (
        <DataAnalysisLabTab
          colaboradores={collabDataset.colaboradores}
          analytics={collabDataset.analytics}
          onOpenReport={openIndividualReport}
        />
      )}

      {/* Modal Dossier Individual 360° */}
      {modalState.id && (
        <CollaboratorReportModal
          colaboradorId={modalState.id}
          autoAnalyze={modalState.autoAnalyze}
          onClose={() => setModalState({ id: null, autoAnalyze: false })}
          onRequestResolved={loadAll}
        />
      )}
    </div>
  );
}
