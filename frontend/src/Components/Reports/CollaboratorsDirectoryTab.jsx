import React, { useMemo, useState } from 'react';
import {
  Search,
  Sparkles,
  FileText,
  Download,
  AlertTriangle,
  Users
} from 'lucide-react';
import { downloadCsvFile, getEstadoStyle, getInitials } from './exportHelpers';

export default function CollaboratorsDirectoryTab({
  colaboradores = [],
  onOpenReport
}) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('TODOS');
  const [modFilter, setModFilter] = useState('TODAS');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [quickChip, setQuickChip] = useState('ALL');

  const departments = useMemo(() => {
    const unique = Array.from(new Set(colaboradores.map((c) => c.departamento).filter(Boolean))).sort();
    return ['TODOS', ...unique];
  }, [colaboradores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (q) {
        const hay = `${c.nombreCompleto} ${c.codigo_empleado} ${c.puesto} ${c.correo} ${c.departamento}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (deptFilter !== 'TODOS' && c.departamento !== deptFilter) return false;
      if (modFilter !== 'TODAS' && c.modalidad !== modFilter) return false;
      if (statusFilter !== 'TODOS' && c.estado !== statusFilter) return false;

      if (quickChip === 'VAC_OVER_20' && !c.excedeTope20Dias) return false;
      if (quickChip === 'PENDING_REQ' && c.solicitudesPendientes === 0) return false;
      if (quickChip === 'ACTIVE_INC' && c.incapacidadesActivas === 0) return false;
      if (quickChip === 'HIGH_PERF' && Number(c.ultimo_score_desempeno) < 4.5) return false;

      return true;
    });
  }, [colaboradores, search, deptFilter, modFilter, statusFilter, quickChip]);

  const counts = useMemo(
    () => ({
      all: colaboradores.length,
      vac20: colaboradores.filter((c) => c.excedeTope20Dias).length,
      pend: colaboradores.filter((c) => c.solicitudesPendientes > 0).length,
      inc: colaboradores.filter((c) => c.incapacidadesActivas > 0).length,
      highPerf: colaboradores.filter((c) => Number(c.ultimo_score_desempeno) >= 4.5).length
    }),
    [colaboradores]
  );

  const handleExportCsv = () => {
    downloadCsvFile(
      filtered,
      [
        { key: 'codigo_empleado', label: 'Código' },
        { key: 'nombreCompleto', label: 'Nombre Completo' },
        { key: 'departamento', label: 'Departamento' },
        { key: 'puesto', label: 'Puesto' },
        { key: 'modalidad', label: 'Modalidad' },
        { key: 'estado', label: 'Estado' },
        { key: 'antiguedadAnios', label: 'Antigüedad (años)' },
        { key: 'dias_disponibles', label: 'Vacaciones Disponibles' },
        { key: 'dias_acumulados', label: 'Vacaciones Acumuladas' },
        { key: 'ultimo_score_desempeno', label: 'Score OKR' },
        { key: 'solicitudesPendientes', label: 'Solicitudes Pendientes' },
        { key: 'diasIncapacidadTotal', label: 'Días Incapacidad' }
      ],
      'reportes_individuales_colaboradores.csv'
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filtros y Búsqueda */}
      <div className="apple-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>
              Directorio y Reportes Individuales 360° ({filtered.length} de {colaboradores.length})
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#6E6E73', margin: '0.2rem 0 0' }}>
              Inspeccione el expediente laboral completo, saldo de vacaciones, incapacidades y genere diagnósticos individuales con DeepSeek-V3.
            </p>
          </div>
          <button
            type="button"
            className="btn-apple-secondary-light"
            style={{ padding: '0.55rem 1.05rem', fontSize: '0.82rem' }}
            onClick={handleExportCsv}
          >
            <Download size={14} /> Exportar CSV ({filtered.length})
          </button>
        </div>

        {/* Inputs Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 2fr) repeat(3, minmax(150px, 1fr))', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#86868B" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="apple-input"
              placeholder="Buscar por nombre, código (EMP-001), puesto o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem', paddingTop: '0.6rem', paddingBottom: '0.6rem', fontSize: '0.85rem' }}
            />
          </div>

          <select
            className="apple-input"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'TODOS' ? 'Todos los Departamentos' : d}</option>
            ))}
          </select>

          <select
            className="apple-input"
            value={modFilter}
            onChange={(e) => setModFilter(e.target.value)}
            style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}
          >
            <option value="TODAS">Todas las Modalidades</option>
            <option value="HIBRIDO">HIBRIDO</option>
            <option value="TELETRABAJO">TELETRABAJO</option>
            <option value="PRESENCIAL">PRESENCIAL</option>
          </select>

          <select
            className="apple-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}
          >
            <option value="TODOS">Todos los Estados</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="VACACIONES">VACACIONES</option>
            <option value="INCAPACITADO">INCAPACITADO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        {/* Quick Filter Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { id: 'ALL', label: `Todos (${counts.all})` },
            { id: 'VAC_OVER_20', label: `Alerta Vacaciones > 20d (${counts.vac20})` },
            { id: 'PENDING_REQ', label: `Con Solicitudes Pendientes (${counts.pend})` },
            { id: 'ACTIVE_INC', label: `Incapacidad Activa (${counts.inc})` },
            { id: 'HIGH_PERF', label: `Alto Desempeño ≥ 4.5 (${counts.highPerf})` }
          ].map((chip) => {
            const active = quickChip === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickChip(chip.id)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: 980,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: active ? '#101114' : '#F5F5F7',
                  color: active ? '#FFFFFF' : '#6E6E73',
                  border: active ? '1px solid #101114' : '1px solid rgba(0,0,0,0.06)'
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla Ejecutiva de Colaboradores */}
      <div className="apple-card" style={{ padding: '1.25rem 1.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#86868B' }}>
            <Users size={28} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <div>No se encontraron colaboradores que coincidan con los filtros aplicados.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Departamento &amp; Modalidad</th>
                  <th>Estado</th>
                  <th>Saldo Vacaciones</th>
                  <th>Desempeño OKR</th>
                  <th>Actividad</th>
                  <th style={{ textAlign: 'right' }}>Reporte Individual</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const stStyle = getEstadoStyle(c.estado);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="avatar-badge" style={{ width: 34, height: 34, fontSize: '0.76rem' }}>
                            {getInitials(c.nombreCompleto)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1D1D1F', fontSize: '0.88rem' }}>
                              {c.nombreCompleto}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#86868B' }}>
                              <code>{c.codigo_empleado}</code> • {c.puesto}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.84rem', fontWeight: 500, color: '#1D1D1F' }}>{c.departamento}</div>
                        <div style={{ fontSize: '0.73rem', color: '#86868B' }}>{c.modalidad} • {c.antiguedadAnios} años</div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.6rem',
                            borderRadius: 980,
                            background: stStyle.bg,
                            color: stStyle.color
                          }}
                        >
                          {c.estado}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: c.excedeTope20Dias ? '#FF9500' : '#1D1D1F' }}>
                          {c.dias_disponibles.toFixed(1)} d
                          {c.excedeTope20Dias && <AlertTriangle size={13} color="#FF9500" title="Supera tope de 20 días" />}
                        </div>
                        <div style={{ width: 92, height: 5, borderRadius: 980, background: '#F5F5F7', marginTop: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${c.porcentajeTope}%`,
                              height: '100%',
                              background: c.excedeTope20Dias ? '#FF9500' : '#2878FF',
                              borderRadius: 980
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: Number(c.ultimo_score_desempeno) >= 4.0 ? '#1b7d36' : '#1D1D1F' }}>
                          {Number(c.ultimo_score_desempeno || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#86868B' }}>{c.nivelDesempeno}</div>
                      </td>
                      <td style={{ fontSize: '0.76rem', color: '#6E6E73' }}>
                        <div>{c.totalSolicitudes} sol. ({c.solicitudesPendientes} pend.)</div>
                        <div>{c.diasIncapacidadTotal}d incap. • {c.totalConsultasChat} chat</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn-apple-secondary-light"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.76rem', borderRadius: 8 }}
                            onClick={() => onOpenReport(c.id, false)}
                          >
                            <FileText size={13} /> Ver Reporte
                          </button>
                          <button
                            type="button"
                            className="btn-apple-primary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.76rem', borderRadius: 8 }}
                            onClick={() => onOpenReport(c.id, true)}
                          >
                            <Sparkles size={13} /> Análisis IA
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
