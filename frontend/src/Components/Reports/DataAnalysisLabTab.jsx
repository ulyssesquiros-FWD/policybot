import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Activity,
  Award,
  Send
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import api from '../../Services/api';
import { downloadCsvFile } from './exportHelpers';

export default function DataAnalysisLabTab({
  colaboradores = [],
  analytics = {},
  onOpenReport
}) {
  const [department, setDepartment] = useState('TODOS');
  const [modality, setModality] = useState('TODAS');
  const [focus, setFocus] = useState('Comparativa de Eficiencia y Ausentismo por Departamento');
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const departments = useMemo(() => {
    const unique = Array.from(new Set(colaboradores.map((c) => c.departamento).filter(Boolean))).sort();
    return ['TODOS', ...unique];
  }, [colaboradores]);

  const filtered = useMemo(
    () =>
      colaboradores.filter((c) => {
        if (department !== 'TODOS' && c.departamento !== department) return false;
        if (modality !== 'TODAS' && c.modalidad !== modality) return false;
        return true;
      }),
    [colaboradores, department, modality]
  );

  // KPIs dinámicos del segmento
  const segmentKpis = useMemo(() => {
    const total = filtered.length;
    const totalVacDisp = filtered.reduce((acc, c) => acc + Number(c.dias_disponibles || 0), 0);
    const totalVacAcum = filtered.reduce((acc, c) => acc + Number(c.dias_acumulados || 0), 0);
    const avgVac = total > 0 ? Number((totalVacDisp / total).toFixed(2)) : 0;
    const over20 = filtered.filter((c) => c.excedeTope20Dias).length;
    const scored = filtered.filter((c) => Number(c.ultimo_score_desempeno) > 0);
    const avgScore =
      scored.length > 0
        ? Number((scored.reduce((a, c) => a + Number(c.ultimo_score_desempeno), 0) / scored.length).toFixed(2))
        : 0;
    const totalIncDays = filtered.reduce((acc, c) => acc + Number(c.diasIncapacidadTotal || 0), 0);

    return {
      total,
      avgVac,
      totalVacDisp: Number(totalVacDisp.toFixed(1)),
      totalVacAcum: Number(totalVacAcum.toFixed(1)),
      over20,
      avgScore,
      totalIncDays
    };
  }, [filtered]);

  // Histograma vacaciones sobre segmento filtrado
  const vacationHistogram = useMemo(
    () => [
      { rango: '0-10d', cantidad: filtered.filter((c) => c.dias_disponibles <= 10).length },
      { rango: '11-15d', cantidad: filtered.filter((c) => c.dias_disponibles > 10 && c.dias_disponibles <= 15).length },
      { rango: '16-20d', cantidad: filtered.filter((c) => c.dias_disponibles > 15 && c.dias_disponibles <= 20).length },
      { rango: '>20d (Exceso)', cantidad: filtered.filter((c) => c.dias_disponibles > 20).length }
    ],
    [filtered]
  );

  // Comparativa por modalidad sobre segmento filtrado
  const modalityStats = useMemo(() => {
    const groups = {};
    for (const c of filtered) {
      const mod = c.modalidad || 'HIBRIDO';
      if (!groups[mod]) {
        groups[mod] = { modalidad: mod, total: 0, sumScore: 0, countScore: 0, sumVac: 0 };
      }
      groups[mod].total += 1;
      groups[mod].sumVac += Number(c.dias_disponibles || 0);
      if (Number(c.ultimo_score_desempeno) > 0) {
        groups[mod].sumScore += Number(c.ultimo_score_desempeno);
        groups[mod].countScore += 1;
      }
    }
    return Object.values(groups).map((g) => ({
      modalidad: g.modalidad,
      colaboradores: g.total,
      promedioOKR: g.countScore > 0 ? Number((g.sumScore / g.countScore).toFixed(2)) : 0,
      promedioVacaciones: Number((g.sumVac / (g.total || 1)).toFixed(2))
    }));
  }, [filtered]);

  const deptMatrix = analytics?.porDepartamento || [];

  const handleRunDatasetAnalysis = async (e) => {
    if (e) e.preventDefault();
    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post('/reports/analyze-dataset', {
        department,
        modality,
        focus,
        customQuestion: customQuestion.trim()
      });
      setAiResult(res.data.analysis);
    } catch (err) {
      setError(err.response?.data?.error || 'Error ejecutando análisis estratégico IA.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportCsv = () => {
    downloadCsvFile(
      filtered,
      [
        { key: 'codigo_empleado', label: 'Código' },
        { key: 'nombreCompleto', label: 'Colaborador' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'modalidad', label: 'Modalidad' },
        { key: 'estado', label: 'Estado' },
        { key: 'dias_disponibles', label: 'Vacaciones Disponibles' },
        { key: 'dias_acumulados', label: 'Vacaciones Acumuladas' },
        { key: 'ultimo_score_desempeno', label: 'Score OKR' },
        { key: 'solicitudesPendientes', label: 'Solicitudes Pendientes' },
        { key: 'diasIncapacidadTotal', label: 'Días Incapacidad' }
      ],
      `analisis_rrhh_${department.toLowerCase().replace(/\s+/g, '_')}.csv`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Panel de Control y Filtros */}
      <div className="apple-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} color="#2878FF" /> Laboratorio de Análisis de Datos Organizacionales
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#6E6E73', margin: '0.2rem 0 0' }}>
              Segmente el talento de TicoTech S.A. por departamento y modalidad, explore distribuciones estadísticas y ejecute análisis estratégicos con IA.
            </p>
          </div>
          <button
            type="button"
            className="btn-apple-secondary-light"
            style={{ padding: '0.55rem 1.05rem', fontSize: '0.82rem' }}
            onClick={handleExportCsv}
          >
            <Download size={14} /> Exportar Segmento CSV ({filtered.length})
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
              Segmento por Departamento
            </label>
            <select
              className="apple-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{ padding: '0.6rem 0.85rem', fontSize: '0.86rem' }}
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d === 'TODOS' ? 'Toda la Organización (Todos)' : d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
              Segmento por Modalidad
            </label>
            <select
              className="apple-input"
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              style={{ padding: '0.6rem 0.85rem', fontSize: '0.86rem' }}
            >
              <option value="TODAS">Todas las Modalidades</option>
              <option value="HIBRIDO">HIBRIDO</option>
              <option value="TELETRABAJO">TELETRABAJO</option>
              <option value="PRESENCIAL">PRESENCIAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5 KPIs Dinámicos del Segmento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '1rem' }}>
        <div className="apple-card" style={{ padding: '1.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Colaboradores</span>
            <Users size={15} color="#2878FF" />
          </div>
          <div className="kpi-big-number">{segmentKpis.total}</div>
          <div style={{ fontSize: '0.76rem', color: '#86868B', marginTop: '0.3rem' }}>En segmento seleccionado</div>
        </div>

        <div className="apple-card" style={{ padding: '1.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Prom. Vacaciones</span>
            <Calendar size={15} color="#2878FF" />
          </div>
          <div className="kpi-big-number">{segmentKpis.avgVac}d</div>
          <div style={{ fontSize: '0.76rem', color: '#FF9500', marginTop: '0.3rem', fontWeight: 600 }}>
            {segmentKpis.over20} casos &gt; 20 días
          </div>
        </div>

        <div className="apple-card" style={{ padding: '1.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Pasivo Vacaciones</span>
            <TrendingUp size={15} color="#FF9500" />
          </div>
          <div className="kpi-big-number">{segmentKpis.totalVacDisp}d</div>
          <div style={{ fontSize: '0.76rem', color: '#86868B', marginTop: '0.3rem' }}>
            {segmentKpis.totalVacAcum}d acumulados totales
          </div>
        </div>

        <div className="apple-card" style={{ padding: '1.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Score OKR Promedio</span>
            <Award size={15} color="#30D158" />
          </div>
          <div className="kpi-big-number" style={{ color: '#30D158' }}>{segmentKpis.avgScore}</div>
          <div style={{ fontSize: '0.76rem', color: '#86868B', marginTop: '0.3rem' }}>Escala institucional 1-5</div>
        </div>

        <div className="apple-card" style={{ padding: '1.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase' }}>Días Incapacidad</span>
            <Activity size={15} color="#FF453A" />
          </div>
          <div className="kpi-big-number">{segmentKpis.totalIncDays}d</div>
          <div style={{ fontSize: '0.76rem', color: '#86868B', marginTop: '0.3rem' }}>Acumulado histórico segmento</div>
        </div>
      </div>

      {/* 3 Gráficos Analíticos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        <div className="apple-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase', marginBottom: '1rem' }}>
            1. Comparativa Departamental (Vacaciones Prom. vs &gt;20d)
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={deptMatrix} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="departamento" tick={{ fontSize: 10, fill: '#86868B' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#86868B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#101114', borderRadius: 12, border: 'none', color: '#FFF' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="promedioVacacionesDisponibles" name="Prom. Días Disp." fill="#2878FF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="colaboradoresSobre20Dias" name="Casos > 20d" fill="#FF9500" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="apple-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase', marginBottom: '1rem' }}>
            2. Histograma de Saldos de Vacaciones (Segmento)
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={vacationHistogram} margin={{ top: 5, right: 10, left: -20, bottom: 10 }}>
                <XAxis dataKey="rango" tick={{ fontSize: 11, fill: '#86868B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#86868B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#101114', borderRadius: 12, border: 'none', color: '#FFF' }} />
                <Bar dataKey="cantidad" name="Colaboradores" fill="#101114" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="apple-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#86868B', textTransform: 'uppercase', marginBottom: '1rem' }}>
            3. Desempeño OKR y Headcount por Modalidad
          </div>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={modalityStats} margin={{ top: 5, right: 10, left: -20, bottom: 10 }}>
                <XAxis dataKey="modalidad" tick={{ fontSize: 11, fill: '#86868B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#86868B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#101114', borderRadius: 12, border: 'none', color: '#FFF' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="colaboradores" name="Headcount" fill="#2878FF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="promedioOKR" name="Prom. OKR" fill="#30D158" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Motor de Análisis Estratégico con IA */}
      <div className="apple-card" style={{ padding: '1.75rem', borderLeft: '4px solid #2878FF' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={18} color="#2878FF" /> Analista Estratégico de Datos RRHH (DeepSeek-V3)
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#6E6E73', margin: '0.2rem 0 0' }}>
            Ejecute un análisis estadístico con IA sobre los indicadores del segmento actual ({department} / {modality}).
          </p>
        </div>

        <form onSubmit={handleRunDatasetAnalysis} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(280px, 2fr) auto', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="apple-input"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              style={{ padding: '0.65rem 0.85rem', fontSize: '0.84rem' }}
            >
              <option value="Comparativa de Eficiencia y Ausentismo por Departamento">Comparativa de Eficiencia y Ausentismo por Depto</option>
              <option value="Riesgo de Acumulación de Vacaciones (>20 días)">Riesgo Acumulación de Vacaciones (&gt;20d)</option>
              <option value="Análisis de Desempeño OKR y Modalidad de Trabajo">Desempeño OKR y Modalidad de Trabajo</option>
              <option value="Impacto de Incapacidades Médicas">Impacto de Incapacidades Médicas</option>
            </select>

            <input
              type="text"
              className="apple-input"
              placeholder="Pregunta analítica opcional (ej. ¿Qué departamento tiene mayor pasivo de vacaciones?)"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              style={{ padding: '0.65rem 0.85rem', fontSize: '0.84rem' }}
            />

            <button
              type="submit"
              className="btn-apple-primary"
              disabled={analyzing}
              style={{ padding: '0.65rem 1.35rem', fontSize: '0.84rem', whiteSpace: 'nowrap' }}
            >
              <Send size={14} /> {analyzing ? 'Analizando...' : 'Analizar Dataset'}
            </button>
          </div>
        </form>

        {error && (
          <div style={{ marginTop: '0.85rem', color: '#d7261e', fontSize: '0.84rem' }}>{error}</div>
        )}

        {aiResult && (
          <div style={{ marginTop: '1.15rem' }}>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.68, color: '#1D1D1F', background: '#F5F5F7', padding: '1.15rem 1.35rem', borderRadius: 14 }}>
              {aiResult.analisisEjecutivo}
            </div>
            <div style={{ fontSize: '0.73rem', color: '#86868B', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>Modelo: {aiResult.modeloIa} • Segmento: {aiResult.filtrosAplicados?.department} / {aiResult.filtrosAplicados?.modality}</span>
              <span>Latencia: {aiResult.latenciaMs} ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Matriz Comparativa por Departamento */}
      <div className="apple-card" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>
            Matriz Comparativa por Departamento
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#6E6E73', margin: '0.2rem 0 0' }}>
            Haga clic en un departamento para filtrar las métricas superiores o inspeccione los casos individuales.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="apple-table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Total</th>
                <th>Activos</th>
                <th>Vac. / Incap.</th>
                <th>Prom. Vac. Disp.</th>
                <th>Casos &gt; 20d</th>
                <th>Sol. Pendientes</th>
                <th>Días Incapacidad</th>
                <th>OKR Promedio</th>
              </tr>
            </thead>
            <tbody>
              {deptMatrix.map((d) => (
                <tr
                  key={d.departamento}
                  onClick={() => setDepartment(d.departamento)}
                  style={{ cursor: 'pointer', background: department === d.departamento ? 'rgba(40, 120, 255, 0.04)' : undefined }}
                >
                  <td>
                    <strong style={{ color: department === d.departamento ? '#2878FF' : '#1D1D1F' }}>{d.departamento}</strong>
                  </td>
                  <td>{d.totalColaboradores}</td>
                  <td>{d.activos}</td>
                  <td>{d.enVacaciones + d.incapacitados}</td>
                  <td>{d.promedioVacacionesDisponibles} d</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.55rem',
                        borderRadius: 980,
                        background: d.colaboradoresSobre20Dias > 0 ? 'rgba(255, 149, 0, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                        color: d.colaboradoresSobre20Dias > 0 ? '#b26500' : '#1b7d36'
                      }}
                    >
                      {d.colaboradoresSobre20Dias}
                    </span>
                  </td>
                  <td>{d.solicitudesPendientes}</td>
                  <td>{d.diasIncapacidadTotal} d</td>
                  <td>
                    <strong style={{ color: d.promedioDesempeno >= 4.0 ? '#1b7d36' : '#1D1D1F' }}>
                      {d.promedioDesempeno}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 Colaboradores del Segmento con acceso rápido al expediente */}
      {filtered.length > 0 && onOpenReport && (
        <div className="apple-card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1D1D1F', marginBottom: '0.75rem' }}>
            Colaboradores con Mayor Saldo de Vacaciones en este Segmento
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {[...filtered]
              .sort((a, b) => b.dias_disponibles - a.dias_disponibles)
              .slice(0, 6)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenReport(c.id, false)}
                  className="btn-apple-secondary-light"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.78rem' }}
                >
                  <strong>{c.nombreCompleto}</strong> ({c.dias_disponibles.toFixed(1)}d)
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
