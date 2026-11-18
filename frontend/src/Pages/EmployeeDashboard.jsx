import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Briefcase,
  Clock,
  MessageSquareText,
  PlusCircle,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  X,
  FileText,
  Download,
  Printer,
  ArrowRightLeft,
  UserCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../Services/api';
import { downloadJsonFile, getEstadoStyle } from '../Components/Reports/exportHelpers';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [form, setForm] = useState({
    tipo: 'VACACIONES',
    fecha_inicio: '',
    fecha_fin: '',
    dias_solicitados: 1,
    motivo: ''
  });
  const [feedback, setFeedback] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employee/me');
      setProfile(res.data);
    } catch (err) {
      setFeedback(err.response?.data?.error || 'Error cargando su expediente personal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setFeedback('');
    try {
      const res = await api.post('/employee/requests', form);
      setFeedback(res.data.message);
      setShowModal(false);
      setForm({ tipo: 'VACACIONES', fecha_inicio: '', fecha_fin: '', dias_solicitados: 1, motivo: '' });
      loadProfile();
    } catch (err) {
      setFeedback(err.response?.data?.error || 'No se pudo registrar la solicitud.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#86868B' }}>
        <div>Cargando expediente personal autorizado...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="apple-card" style={{ textAlign: 'center', color: '#FF453A' }}>
        {feedback || 'No fue posible cargar su expediente.'}
      </div>
    );
  }

  const { colaborador, saldoVacaciones, solicitudes, incapacidades, movimientos } = profile;

  const diasDisponibles = Number(saldoVacaciones?.dias_disponibles || 0);
  const diasAcumulados = Number(saldoVacaciones?.dias_acumulados || 0);
  const diasDisfrutados = Number(saldoVacaciones?.dias_disfrutados || 0);
  const topeMaximo = 20;
  const pctTope = Math.min(100, Math.round((diasDisponibles / topeMaximo) * 100));

  const chartData = [
    { name: 'Acumulados', dias: diasAcumulados },
    { name: 'Disfrutados', dias: diasDisfrutados },
    { name: 'Disponibles', dias: diasDisponibles }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. Header Hero Editorial */}
      <div
        className="apple-card"
        style={{
          background: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          padding: '2.5rem'
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2878FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            PORTAL DEL COLABORADOR • {colaborador.codigo_empleado}
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 600, letterSpacing: '-0.03em', color: '#1D1D1F', margin: '0.25rem 0' }}>
            Hola, {colaborador.nombre}.
          </h2>
          <p style={{ color: '#6E6E73', fontSize: '1.05rem' }}>
            {colaborador.puesto} • {colaborador.departamento} • Modalidad {colaborador.modalidad}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn-apple-primary"
            style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}
          >
            <PlusCircle size={16} />
            <span>Solicitar Vacaciones</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="btn-apple-secondary-light"
            style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}
          >
            <FileText size={16} />
            <span>Ver Mi Reporte Individual Completo</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="btn-apple-secondary-light"
            style={{ padding: '0.8rem 1.5rem', fontSize: '0.9rem' }}
          >
            <MessageSquareText size={16} />
            <span>Consultar con PolicyBot</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            backgroundColor: 'rgba(48, 209, 88, 0.1)',
            border: '1px solid rgba(48, 209, 88, 0.25)',
            color: '#059669',
            padding: '1rem 1.5rem',
            borderRadius: '14px',
            fontSize: '0.925rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Visualizador Gran Formato de Saldo de Vacaciones */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Panel Principal de Vacaciones */}
        <div className="apple-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86868B' }}>
                Saldo Actual de Vacaciones
              </span>
              <span style={{ fontSize: '0.75rem', color: '#2878FF', fontWeight: 600, background: 'rgba(40, 120, 255, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                POL-VAC-001
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
              <span className="kpi-big-number" style={{ fontSize: '3.75rem' }}>
                {diasDisponibles.toFixed(1)}
              </span>
              <span style={{ fontSize: '1.25rem', color: '#86868B', fontWeight: 500 }}>
                días hábiles
              </span>
            </div>

            <div style={{ fontSize: '0.925rem', color: '#6E6E73', marginTop: '0.25rem' }}>
              {diasAcumulados.toFixed(1)} acumulados • {diasDisfrutados.toFixed(1)} disfrutados
            </div>

            {/* Barra de progreso hacia el tope de 20 días */}
            <div style={{ marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#86868B', marginBottom: '0.5rem' }}>
                <span>Capacidad acumulada</span>
                <span>{diasDisponibles.toFixed(1)} de {topeMaximo} días tope</span>
              </div>
              <div style={{ width: '100%', height: '8px', borderRadius: '980px', backgroundColor: '#F5F5F7', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${pctTope}%`,
                    height: '100%',
                    backgroundColor: pctTope > 80 ? '#FF9500' : '#2878FF',
                    borderRadius: '980px',
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#86868B', marginTop: '0.4rem' }}>
                Próximo vencimiento reglamentario: <strong>{String(saldoVacaciones?.fecha_proximo_vencimiento || '2027-02-17')}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Gráfico de Desglose de Vacaciones */}
        <div className="apple-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86868B', marginBottom: '1.5rem' }}>
            Distribución del Período
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#86868B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#86868B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101114', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                />
                <Bar dataKey="dias" fill="#2878FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#86868B', textAlign: 'center', marginTop: '0.75rem' }}>
            Base legal: Art. 153 Código de Trabajo (mínimo 12 días) • TicoTech otorga 14 días iniciales.
          </div>
        </div>
      </div>

      {/* 3. Indicadores de Desempeño y Evaluaciones */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem'
        }}
      >
        <div className="apple-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Última Calificación
          </div>
          <div className="kpi-big-number" style={{ margin: '0.5rem 0', color: '#30D158' }}>
            {Number(colaborador.ultimo_score_desempeno || 4.45).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#86868B' }}>
            Escala 1.0 a 5.0 (Desempeño Sobresaliente)
          </div>
        </div>

        <div className="apple-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Próxima Evaluación OKR
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 600, margin: '0.75rem 0 0.5rem', color: '#1D1D1F' }}>
            {String(colaborador.proxima_evaluacion || '').slice(0, 10)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#86868B' }}>
            Ponderación: 60% OKR • 40% Competencias (POL-EVA-009)
          </div>
        </div>

        <div className="apple-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Antigüedad en TicoTech
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 600, margin: '0.75rem 0 0.5rem', color: '#1D1D1F' }}>
            Desde {String(colaborador.fecha_ingreso || '').slice(0, 10)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#86868B' }}>
            Expediente activo sin sanciones disciplinarias
          </div>
        </div>
      </div>

      {/* 4. Tabla de Solicitudes Personales Recientes */}
      <div className="apple-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
              Historial de Solicitudes
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6E6E73' }}>
              Registro personal protegido bajo la Ley N° 8968 de Costa Rica.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#86868B', background: '#F5F5F7', padding: '0.3rem 0.75rem', borderRadius: '980px' }}>
            {solicitudes?.length || 0} Registros
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="apple-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Días Solicitados</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(solicitudes || []).slice(0, 8).map((sol) => (
                <tr key={sol.id}>
                  <td style={{ fontWeight: 600 }}>{sol.tipo}</td>
                  <td>{sol.dias_solicitados} días hábiles</td>
                  <td>{String(sol.fecha_inicio).slice(0, 10)}</td>
                  <td>{String(sol.fecha_fin).slice(0, 10)}</td>
                  <td style={{ color: '#6E6E73', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sol.motivo || 'Sin observaciones'}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '980px',
                        backgroundColor:
                          sol.estado === 'APROBADA'
                            ? 'rgba(48, 209, 88, 0.12)'
                            : sol.estado === 'RECHAZADA'
                            ? 'rgba(255, 69, 58, 0.12)'
                            : 'rgba(255, 149, 0, 0.12)',
                        color:
                          sol.estado === 'APROBADA'
                            ? '#30D158'
                            : sol.estado === 'RECHAZADA'
                            ? '#FF453A'
                            : '#FF9500'
                      }}
                    >
                      {sol.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Historial de Incapacidades si existen */}
      {incapacidades && incapacidades.length > 0 && (
        <div className="apple-card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
              Incapacidades Médicas Registradas (CCSS / INS)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6E6E73' }}>
              Boletas reportadas formalmente bajo el procedimiento PRO-INC-003.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Boleta #</th>
                  <th>Entidad Emisora</th>
                  <th>Tipo</th>
                  <th>Días</th>
                  <th>Período</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {incapacidades.map((inc) => (
                  <tr key={inc.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{inc.numero_boleta}</td>
                    <td>{inc.entidad_emisora}</td>
                    <td>{inc.tipo_incapacidad || inc.tipo}</td>
                    <td>{inc.dias_incapacidad ?? inc.dias} días</td>
                    <td>{String(inc.fecha_inicio).slice(0, 10)} → {String(inc.fecha_fin).slice(0, 10)}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          backgroundColor: inc.estado === 'ACTIVA' ? 'rgba(255, 69, 58, 0.12)' : 'rgba(0, 0, 0, 0.05)',
                          color: inc.estado === 'ACTIVA' ? '#FF453A' : '#6E6E73'
                        }}
                      >
                        {inc.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Reporte Individual Completo del Colaborador */}
      {showReportModal && (() => {
        const start = colaborador.fecha_ingreso ? new Date(colaborador.fecha_ingreso) : new Date();
        const now = new Date();
        const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
        const years = Math.floor(months / 12);
        const remMonths = months % 12;
        const antiguedadTexto = years > 0 ? `${years} año(s) y ${remMonths} mes(es)` : `${remMonths} mes(es)`;
        const tasaUso = diasAcumulados > 0 ? ((diasDisfrutados / diasAcumulados) * 100).toFixed(1) : '0.0';

        const handleDownloadTxt = () => {
          const textReport = [
            `REPORTE INDIVIDUAL DE EXPEDIENTE — TICOTECH S.A.`,
            `Colaborador: ${colaborador.nombre} ${colaborador.apellidos} (${colaborador.codigo_empleado})`,
            `Puesto / Depto: ${colaborador.puesto} — ${colaborador.departamento} (${colaborador.modalidad})`,
            `Jefatura Directa: ${colaborador.jefe_nombre ? `${colaborador.jefe_nombre} ${colaborador.jefe_apellidos}` : 'Dirección Ejecutiva'}`,
            `Fecha de Ingreso: ${String(colaborador.fecha_ingreso).slice(0, 10)} (Antigüedad: ${antiguedadTexto})`,
            `Vacaciones: ${diasDisponibles.toFixed(1)} disponibles de ${diasAcumulados.toFixed(1)} acumulados (Uso: ${tasaUso}%)`,
            `Última Calificación OKR: ${Number(colaborador.ultimo_score_desempeno || 0).toFixed(2)} / 5.0`,
            `Solicitudes: ${(solicitudes || []).length} registradas`,
            `Incapacidades: ${(incapacidades || []).length} boletas`,
            `Movimientos de Personal: ${(movimientos || []).length} registros`
          ].join('\n');
          const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `mi_reporte_${colaborador.codigo_empleado}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(16, 17, 20, 0.6)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
              zIndex: 1000
            }}
          >
            <div
              className="apple-card"
              style={{
                width: '100%',
                maxWidth: 920,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2rem',
                backgroundColor: '#F5F5F7',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#2878FF', textTransform: 'uppercase' }}>
                    Expediente Personal Certificado • {colaborador.codigo_empleado}
                  </span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1D1D1F', margin: '0.2rem 0 0' }}>
                    {colaborador.nombre} {colaborador.apellidos}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-apple-secondary-light"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                    onClick={() => downloadJsonFile(profile, `mi_reporte_${colaborador.codigo_empleado}.json`)}
                  >
                    <Download size={14} /> JSON
                  </button>
                  <button
                    type="button"
                    className="btn-apple-secondary-light"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                    onClick={handleDownloadTxt}
                  >
                    <FileText size={14} /> TXT
                  </button>
                  <button
                    type="button"
                    className="btn-apple-secondary-light"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                    onClick={() => window.print()}
                  >
                    <Printer size={14} /> Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    style={{ width: 34, height: 34, borderRadius: '50%', background: '#FFFFFF', color: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="apple-card" style={{ padding: '1.25rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.84rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#86868B', textTransform: 'uppercase' }}>Puesto y Modalidad</div>
                  <strong>{colaborador.puesto} ({colaborador.modalidad})</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#86868B', textTransform: 'uppercase' }}>Jefatura Directa</div>
                  <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <UserCheck size={14} color="#2878FF" />
                    {colaborador.jefe_nombre ? `${colaborador.jefe_nombre} ${colaborador.jefe_apellidos}` : 'Dirección Ejecutiva'}
                  </strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#86868B', textTransform: 'uppercase' }}>Antigüedad</div>
                  <strong>{antiguedadTexto} (desde {String(colaborador.fecha_ingreso).slice(0, 10)})</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#86868B', textTransform: 'uppercase' }}>Tasa de Uso Vacaciones</div>
                  <strong>{tasaUso}% ({diasDisfrutados.toFixed(1)}d disfrutados)</strong>
                </div>
              </div>

              <div className="apple-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Historial de Movimientos de Personal ({(movimientos || []).length})
                </h4>
                {(movimientos || []).length === 0 ? (
                  <div style={{ color: '#86868B', fontSize: '0.84rem' }}>Sin movimientos recientes registrados.</div>
                ) : (
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Movimiento</th>
                        <th>Motivo</th>
                        <th>Autorizado Por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((mov) => (
                        <tr key={mov.id}>
                          <td>{String(mov.fecha_efectiva).slice(0, 10)}</td>
                          <td>
                            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <ArrowRightLeft size={13} color="#2878FF" /> {mov.tipo_movimiento}
                            </strong>
                          </td>
                          <td>{mov.motivo}</td>
                          <td style={{ color: '#6E6E73' }}>{mov.autorizado_por}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="apple-card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Solicitudes ({(solicitudes || []).length}) e Incapacidades ({(incapacidades || []).length})
                </h4>
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Período</th>
                      <th>Días</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(solicitudes || []).map((s) => {
                      const st = getEstadoStyle(s.estado);
                      return (
                        <tr key={`sol-${s.id}`}>
                          <td><strong>{s.tipo}</strong></td>
                          <td>{String(s.fecha_inicio).slice(0, 10)} → {String(s.fecha_fin).slice(0, 10)}</td>
                          <td>{s.dias_solicitados} d</td>
                          <td>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 980, background: st.bg, color: st.color }}>
                              {s.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {(incapacidades || []).map((inc) => {
                      const st = getEstadoStyle(inc.estado);
                      return (
                        <tr key={`inc-${inc.id}`}>
                          <td><strong>INCAPACIDAD ({inc.tipo_incapacidad || inc.tipo})</strong></td>
                          <td>{String(inc.fecha_inicio).slice(0, 10)} → {String(inc.fecha_fin).slice(0, 10)}</td>
                          <td>{inc.dias_incapacidad ?? inc.dias} d</td>
                          <td>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 980, background: st.bg, color: st.color }}>
                              {inc.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Minimalista de Nueva Solicitud */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000
          }}
        >
          <div
            className="apple-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2.5rem',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1D1D1F' }}>
                Nueva Solicitud Laboral
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ color: '#86868B', padding: '0.25rem', borderRadius: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#86868B', marginBottom: '0.4rem' }}>
                  Tipo de Solicitud
                </label>
                <select
                  className="apple-input"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="VACACIONES">Vacaciones Ordinarias</option>
                  <option value="PERMISO_CON_GOCE">Permiso con Goce de Salario</option>
                  <option value="PERMISO_SIN_GOCE">Permiso sin Goce de Salario</option>
                  <option value="LICENCIA_PATERNIDAD">Licencia de Paternidad</option>
                  <option value="LICENCIA_DUELO">Licencia por Duelo</option>
                  <option value="CONSTANCIA_SALARIAL">Constancia Salarial</option>
                  <option value="TELETRABAJO">Ajuste de Teletrabajo</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#86868B', marginBottom: '0.4rem' }}>
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    required
                    className="apple-input"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#86868B', marginBottom: '0.4rem' }}>
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    required
                    className="apple-input"
                    value={form.fecha_fin}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#86868B', marginBottom: '0.4rem' }}>
                  Días Hábiles
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  className="apple-input"
                  value={form.dias_solicitados}
                  onChange={(e) => setForm({ ...form, dias_solicitados: Number(e.target.value) })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#86868B', marginBottom: '0.4rem' }}>
                  Motivo / Observaciones
                </label>
                <textarea
                  className="apple-input"
                  rows={3}
                  placeholder="Detalle de la solicitud..."
                  value={form.motivo}
                  onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-apple-secondary-light"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-apple-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Enviar a Jefatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
