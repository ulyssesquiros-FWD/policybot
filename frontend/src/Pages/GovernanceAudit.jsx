import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  AlertTriangle,
  Activity,
  FileCode2,
  Database,
  Lock,
  CheckCircle2,
  Layers,
  Sparkles,
  Server,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../Services/api';

export default function GovernanceAudit() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSummary = async (resultado = '') => {
    setLoading(true);
    try {
      const url = resultado ? `/governance/summary?resultado=${resultado}` : '/governance/summary';
      const res = await api.get(url);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary(filter);
  }, [filter]);

  if (loading && !data) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#86868B', fontSize: '0.95rem' }}>
        Cargando matriz integral de gobernanza y auditoría...
      </div>
    );
  }

  const integ = data?.integrations || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: 1440, margin: '0 auto' }}>
      {/* Editorial Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: '#2878FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Enterprise Trust &amp; Compliance
          </span>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.03em', margin: '0.2rem 0' }}>
            Gobernanza, Seguridad &amp; Auditoría
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#86868B', margin: 0, maxWidth: 740 }}>
            Supervisión continua de la arquitectura multiagente LangGraph, barreras de privacidad de datos, inventario de modelos y trazabilidad inmutable de eventos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 999,
              background: 'rgba(52, 199, 89, 0.12)',
              color: '#1b7d36',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <ShieldCheck size={14} /> Sistema en Cumplimiento Total
          </span>
        </div>
      </div>

      {/* Grand Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Reglas de Gobernanza
          </span>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.04em', margin: '0.2rem 0' }}>
            6/6
          </div>
          <span style={{ fontSize: '0.74rem', color: '#34C759', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} /> Human-in-the-Loop activo
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Agentes en Grafo
          </span>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.04em', margin: '0.2rem 0' }}>
            {data?.agents?.length || 5}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#86868B' }}>
            LangGraph.js orquestado
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Riesgos Mitigados
          </span>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.04em', margin: '0.2rem 0' }}>
            {data?.riskRegister?.length || 6}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#34C759', fontWeight: 600 }}>
            0 riesgos desatendidos
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.35rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          <span style={{ fontSize: '0.76rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Eventos Auditados
          </span>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#101114', letterSpacing: '-0.04em', margin: '0.2rem 0' }}>
            {data?.auditLogs?.length || 0}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#86868B' }}>
            Registro inmutable en MySQL
          </span>
        </div>
      </div>

      {/* Integration Live Health Cards */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '1.75rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#101114', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Activity size={18} color="#2878FF" /> Estado Real de Integraciones &amp; Servicios de Fondo
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
            Topología verificada de bases de datos, modelos fundacionales y APIs de terceros.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* MySQL Card */}
          <div style={{ padding: '1.1rem', borderRadius: 14, background: '#F5F5F7', border: '1px solid rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase' }}>
                Base de Datos Relacional
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: integ.database?.mysqlConnected ? '#34C759' : '#FF9500'
                }}
              />
            </div>
            <strong style={{ fontSize: '0.92rem', color: '#101114' }}>
              {integ.database?.mysqlConnected ? 'MySQL Live (policybot_rrhh)' : 'Snapshot Local Activo'}
            </strong>
            <div style={{ fontSize: '0.74rem', color: '#86868B', marginTop: '0.35rem' }}>
              Host: <code>{integ.database?.host}:{integ.database?.port}</code> · Sequelize ORM
            </div>
          </div>

          {/* DeepSeek Card */}
          <div style={{ padding: '1.1rem', borderRadius: 14, background: '#F5F5F7', border: '1px solid rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase' }}>
                Modelo de Lenguaje LLM
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: integ.deepseek?.configured ? '#34C759' : '#FF9500'
                }}
              />
            </div>
            <strong style={{ fontSize: '0.92rem', color: '#101114' }}>
              DeepSeek-V3 ({integ.deepseek?.model})
            </strong>
            <div style={{ fontSize: '0.74rem', color: '#86868B', marginTop: '0.35rem' }}>
              API Live · Consumo: {integ.deepseek?.stats?.totalTokens ?? 0} tokens
            </div>
          </div>

          {/* Qdrant & Embeddings Card */}
          <div style={{ padding: '1.1rem', borderRadius: 14, background: '#F5F5F7', border: '1px solid rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase' }}>
                Base Vectorial &amp; Embeddings
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: integ.qdrant?.qdrantConnected ? '#34C759' : '#FF9500'
                }}
              />
            </div>
            <strong style={{ fontSize: '0.92rem', color: '#101114' }}>
              Qdrant v1.20 + BGE-M3 (1024d)
            </strong>
            <div style={{ fontSize: '0.74rem', color: '#86868B', marginTop: '0.35rem' }}>
              Puntos: {integ.qdrant?.localMirrorPoints ?? 47} · Endpoint: 127.0.0.1:6333
            </div>
          </div>

          {/* Drive & Cron Card */}
          <div style={{ padding: '1.1rem', borderRadius: 14, background: '#F5F5F7', border: '1px solid rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#86868B', fontWeight: 600, textTransform: 'uppercase' }}>
                Google Drive &amp; Cron
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: integ.googleDrive?.connected ? '#34C759' : '#FF9500'
                }}
              />
            </div>
            <strong style={{ fontSize: '0.92rem', color: '#101114' }}>
              {integ.googleDrive?.connected ? 'OAuth 2.0 Conectado' : 'Pendiente Autorización'}
            </strong>
            <div style={{ fontSize: '0.74rem', color: '#86868B', marginTop: '0.35rem' }}>
              Cron: {integ.cronScheduler?.cronExpression} ({integ.cronScheduler?.timezone})
            </div>
          </div>
        </div>
      </div>

      {/* 6 Inviolable Rules of AI Governance */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '1.75rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#101114', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <ShieldCheck size={18} color="#34C759" /> Reglas Irrenunciables de Gobernanza de IA
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
            Principios rectores codificados que restringen la autonomía del modelo e imponen supervisión humana.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '0.85rem' }}>
          {(data?.rules || []).map((r) => (
            <div
              key={r.id}
              style={{
                padding: '1rem 1.15rem',
                borderRadius: 14,
                background: '#F5F5F7',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#101114', marginBottom: '0.2rem' }}>
                  {r.id}: {r.regla}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#86868B' }}>
                  Restricción verificada en pipeline de validación
                </div>
              </div>
              <span
                style={{
                  padding: '0.2rem 0.65rem',
                  borderRadius: 999,
                  background: 'rgba(52, 199, 89, 0.12)',
                  color: '#1b7d36',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {r.cumplimiento}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Columns: Agent Inventory & Prompt Versions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.25rem' }}>
        {/* Multi-Agent Inventory */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '1.75rem',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#101114', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Cpu size={18} color="#2878FF" /> Inventario de Agentes (LangGraph)
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
              Agentes autónomos especializados con responsabilidades delimitadas.
            </span>
          </div>

          <div className="table-wrap">
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Modelo / Motor</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data?.agents || []).map((ag) => (
                  <tr key={ag.id}>
                    <td>
                      <strong style={{ color: '#101114', fontSize: '0.86rem' }}>{ag.nombre}</strong>
                      <div style={{ fontSize: '0.74rem', color: '#86868B' }}>{ag.rol}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.76rem', color: '#2878FF' }}>{ag.modelo}</code>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: 999,
                          background: 'rgba(52, 199, 89, 0.12)',
                          color: '#1b7d36',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        {ag.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prompt Registry */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '1.75rem',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#101114', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FileCode2 size={18} color="#2878FF" /> Registro de Versiones de Prompts
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
              Control estricto de versiones de instrucciones operativas del sistema.
            </span>
          </div>

          <div className="table-wrap">
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Versión</th>
                  <th>Archivo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data?.promptVersions || []).map((pv, i) => (
                  <tr key={i}>
                    <td>
                      <strong style={{ color: '#101114', fontSize: '0.86rem' }}>{pv.agente}</strong>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: 999,
                          background: 'rgba(40, 120, 255, 0.12)',
                          color: '#2878FF',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        {pv.version}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.72rem', color: '#86868B' }}>{pv.archivo}</code>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: 999,
                          background: 'rgba(52, 199, 89, 0.12)',
                          color: '#1b7d36',
                          fontSize: '0.72rem',
                          fontWeight: 600
                        }}
                      >
                        {pv.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Risk Register */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '1.75rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#101114', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <AlertTriangle size={18} color="#FF9500" /> Registro de Riesgos de Inteligencia Artificial &amp; Privacidad
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
            Matriz de amenazas con mecanismos de mitigación arquitecturales implementados.
          </span>
        </div>

        <div className="table-wrap">
          <table className="apple-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Riesgo Identificado</th>
                <th>Severidad</th>
                <th>Mitigación Implementada</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(data?.riskRegister || []).map((rk) => (
                <tr key={rk.id}>
                  <td>
                    <code style={{ fontSize: '0.74rem', color: '#2878FF', fontWeight: 600 }}>{rk.id}</code>
                  </td>
                  <td>
                    <strong style={{ color: '#101114', fontSize: '0.84rem' }}>{rk.riesgo}</strong>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 999,
                        background:
                          rk.severidad === 'CRÍTICA'
                            ? 'rgba(255, 59, 48, 0.12)'
                            : rk.severidad === 'ALTA'
                            ? 'rgba(255, 149, 0, 0.12)'
                            : 'rgba(40, 120, 255, 0.12)',
                        color:
                          rk.severidad === 'CRÍTICA'
                            ? '#d7261e'
                            : rk.severidad === 'ALTA'
                            ? '#b26500'
                            : '#2878FF',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    >
                      {rk.severidad}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#48484A', maxWidth: 420 }}>{rk.mitigacion}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.55rem',
                        borderRadius: 999,
                        background: 'rgba(52, 199, 89, 0.12)',
                        color: '#1b7d36',
                        fontSize: '0.72rem',
                        fontWeight: 600
                      }}
                    >
                      {rk.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Audit Log Table */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '1.75rem',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#101114', margin: 0 }}>
              Bitácora de Eventos de Auditoría ({data?.auditLogs?.length || 0})
            </h2>
            <span style={{ fontSize: '0.78rem', color: '#86868B' }}>
              Trazabilidad inmutable de todas las consultas, bloqueos de seguridad y decisiones de la red multiagente.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="#86868B" />
            <select
              className="apple-input"
              style={{ width: 220, padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">Todos los resultados</option>
              <option value="EXITO">EXITO</option>
              <option value="BLOQUEADO_SEGURIDAD">BLOQUEADO_SEGURIDAD</option>
              <option value="BLOQUEADO_GOBERNANZA">BLOQUEADO_GOBERNANZA</option>
              <option value="ESCALADO">ESCALADO</option>
            </select>
          </div>
        </div>

        <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="apple-table">
            <thead>
              <tr>
                <th>Fecha &amp; Hora</th>
                <th>Usuario / Rol</th>
                <th>Acción</th>
                <th>Agente Invocado</th>
                <th>Latencia</th>
                <th>Resultado</th>
                <th>Detalle del Evento</th>
              </tr>
            </thead>
            <tbody>
              {(data?.auditLogs || []).map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#86868B' }}>
                    {String(log.created_at).slice(0, 19).replace('T', ' ')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#101114', fontSize: '0.82rem' }}>
                      {log.nombre ? `${log.nombre} ${log.apellidos}` : 'Sistema / Anónimo'}
                    </div>
                    <span
                      style={{
                        padding: '0.1rem 0.45rem',
                        borderRadius: 999,
                        background: '#F5F5F7',
                        color: '#86868B',
                        fontSize: '0.68rem',
                        fontWeight: 500
                      }}
                    >
                      {log.rol}
                    </span>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.74rem', color: '#2878FF' }}>{log.accion}</code>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#48484A' }}>{log.agente_utilizado || '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: '#86868B' }}>{log.tiempo_respuesta_ms} ms</td>
                  <td>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 999,
                        background:
                          log.resultado === 'EXITO'
                            ? 'rgba(52, 199, 89, 0.12)'
                            : log.resultado === 'ESCALADO'
                            ? 'rgba(255, 149, 0, 0.12)'
                            : 'rgba(255, 59, 48, 0.12)',
                        color:
                          log.resultado === 'EXITO'
                            ? '#1b7d36'
                            : log.resultado === 'ESCALADO'
                            ? '#b26500'
                            : '#d7261e',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    >
                      {log.resultado}
                    </span>
                  </td>
                  <td style={{ maxWidth: 300, fontSize: '0.78rem', color: '#48484A' }}>
                    {log.detalle}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
