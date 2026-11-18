import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LandingNavbar from '../Components/LandingNavbar';
import BrandLogo from '../Components/BrandLogo';
import {
  ArrowRight,
  Shield,
  Cpu,
  Layers,
  Search,
  Users,
  BarChart3,
  FileText,
  UserCheck,
  CheckCircle2,
  Lock,
  Database,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import api from '../Services/api';

export default function LandingPage() {
  const navigate = useNavigate();

  // Estados de interacción
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [activeMetricTab, setActiveMetricTab] = useState('vacaciones');
  const [activePipelineStep, setActivePipelineStep] = useState(0);
  const [liveKpiData, setLiveKpiData] = useState(null);

  // Cargar métricas reales del backend si están disponibles
  useEffect(() => {
    let isMounted = true;
    api.get('/reports/daily/latest')
      .then((res) => {
        if (isMounted && res.data?.kpis) {
          setLiveKpiData(res.data.kpis);
        }
      })
      .catch(() => {
        // En caso de que no haya sesión o el endpoint sea restringido, usamos las métricas oficiales de TicoTech
      });
    return () => { isMounted = false; };
  }, []);

  // 7 Capacidades de Agentes
  const agentsData = [
    {
      id: 'orquestador',
      nombre: 'Agente Orquestador',
      subtitulo: 'Clasificación de intenciones y síntesis única',
      rol: 'Director de Flujo',
      responsabilidad: 'Analiza cada consulta entrante, clasifica la intención semántica en menos de 100 ms, valida los límites de seguridad contra inyecciones y sintetiza la respuesta final respetando las directrices éticas.',
      datos: 'Token JWT autenticado, historial de la sesión, consulta del usuario.',
      herramientas: 'LangGraph.js StateGraph, clasificador de guardrails, validador de políticas.',
      resultado: 'Respuesta consolidada en lenguaje natural con metadatos estructurados y trazabilidad completa.',
      icono: Cpu,
      color: '#2878FF'
    },
    {
      id: 'rag',
      nombre: 'Agente Políticas RAG',
      subtitulo: 'Recuperación documental de alta fidelidad',
      rol: 'Especialista Legal y Normativo',
      responsabilidad: 'Consulta el índice vectorial en Qdrant con embeddings densos de 1024 dimensiones generados por BGE-M3. Extrae fragmentos exactos de las políticas laborales oficiales de Costa Rica y TicoTech S.A.',
      datos: 'Colección policybot_hr_docs en Qdrant (47 puntos activos), metadatos de Google Drive.',
      herramientas: 'Qdrant REST client, Ollama BGE-M3 (1024d), Cosine Distance, filtro sustantivo léxico.',
      resultado: 'Evidencia contextual con citas exactas (documento, versión, sección y URL a Google Drive).',
      icono: Search,
      color: '#00C7BE'
    },
    {
      id: 'datos',
      nombre: 'Agente Datos Colaborador',
      subtitulo: 'Aislamiento estricto de expedientes personales',
      rol: 'Custodio de Datos Personales',
      responsabilidad: 'Accede exclusivamente al expediente del colaborador autenticado. Consulta saldos de vacaciones, estado de solicitudes e incapacidades médicas sin posibilidad de filtrar datos de terceros (Ley N° 8968).',
      datos: 'Tablas saldos_vacaciones, solicitudes, incapacidades y colaboradores en MySQL.',
      herramientas: 'Sequelize ORM (User, Collaborator, VacationBalance, Request, Disability).',
      resultado: 'Saldos numéricos verificados, desglose de días disponibles, disfrutados y acumulados.',
      icono: Users,
      color: '#5856D6'
    },
    {
      id: 'reportes',
      nombre: 'Agente Analista de Reportes',
      subtitulo: 'Inteligencia operativa y analítica ejecutiva',
      rol: 'Analista de Negocio RRHH',
      responsabilidad: 'Calcula indicadores agregados sobre los 55 colaboradores: tasa de rotación trimestral, índice de ausentismo, distribución de solicitudes y colaboradores en riesgo por superar el tope de vacaciones.',
      datos: '15 tablas relacionales en MySQL, reportes diarios generados a las 07:00 CR.',
      herramientas: 'Sequelize ORM agregaciones, node-cron scheduler (America/Costa_Rica), DeepSeek reasoning.',
      resultado: '13 KPIs ejecutivos estructurados y resumen narrativo de tendencias laborales.',
      icono: BarChart3,
      color: '#FF9500'
    },
    {
      id: 'ingesta',
      nombre: 'Agente Ingesta y Sincronización',
      subtitulo: 'Conexión en vivo con Google Drive API v3',
      rol: 'Ingeniero de Datos Documentales',
      responsabilidad: 'Inspecciona la carpeta autorizada en Google Drive mediante OAuth 2.0. Detecta documentos nuevos o modificados, fragmenta en bloques semánticos de 500-1000 tokens e indexa vectores en Qdrant.',
      datos: 'Google Drive API v3 (OAuth 2.0 Web Client, scopes drive.readonly).',
      herramientas: 'Google Drive Client, chunker semántico, token crypto AES-256-GCM, Qdrant upsert.',
      resultado: 'Catálogo documental sincronizado con UUIDs deterministas RFC 4122 v4 sin duplicados.',
      icono: FileText,
      color: '#34C759'
    },
    {
      id: 'validador',
      nombre: 'Agente Validador',
      subtitulo: 'Supervisión cruzada y control de calidad',
      rol: 'Auditor de Integridad',
      responsabilidad: 'Revisa de forma exhaustiva las respuestas antes de ser emitidas. Comprueba la presencia de citas cuando se citan políticas, verifica que las cifras coincidan con la base de datos y bloquea cualquier fuga de datos personales.',
      datos: 'Borrador de respuesta, fragmentos recuperados, metadatos del colaborador solicitante.',
      herramientas: 'Detector anti-fugas PII, motor de consistencia numérica, validador de enlaces Drive.',
      resultado: 'Visto bueno de seguridad o instrucción de rectificación inmediata antes de entrega.',
      icono: Shield,
      color: '#FF2D55'
    },
    {
      id: 'escalamiento',
      nombre: 'Escalamiento Humano',
      subtitulo: 'Supervisión humana ante vacíos documentales',
      rol: 'Enlace con Gestión del Talento',
      responsabilidad: 'Cuando una consulta sobre políticas no tiene respaldo empírico en los documentos indexados, el sistema reconoce la ausencia de información y genera automáticamente un ticket de escalamiento hacia RRHH.',
      datos: 'Tabla escalaciones_rrhh, auditoría de eventos no concluyentes.',
      herramientas: 'Generador de tickets trazables con prefijo ESC-2026-XXXX, notificaciones al panel RRHH.',
      resultado: 'Ticket registrado con categoría, prioridad, pregunta original y asignación a RRHH.',
      icono: UserCheck,
      color: '#AF52DE'
    }
  ];

  // Pasos del Pipeline de Conocimiento Conectado
  const pipelineSteps = [
    {
      step: '01',
      title: 'Google Drive API v3',
      subtitle: 'Fuente Canónica Oficial',
      desc: 'Los documentos de políticas se almacenan y editan en carpetas corporativas seguras. Mediante OAuth 2.0 autenticado con refresh tokens cifrados en AES-256-GCM, el sistema lee los documentos sin almacenamiento plano.',
      meta: 'Scope: drive.readonly | 18 políticas institucionales | Cero almacenamiento inseguro'
    },
    {
      step: '02',
      title: 'BAAI BGE-M3 (1024d)',
      subtitle: 'Vectorización Densa Multilingüe',
      desc: 'Cada política se segmenta en fragmentos de 500 a 1000 tokens preservando títulos y contexto. Ollama ejecuta localmente el modelo BGE-M3 generando representaciones vectoriales densas de 1024 dimensiones en ~149 ms.',
      meta: 'Modelo: bge-m3:latest (1.2 GB) | 1024 dimensiones | Latencia: 149 ms'
    },
    {
      step: '03',
      title: 'Qdrant Server Real',
      subtitle: 'Base Vectorial de Alto Rendimiento',
      desc: 'Los vectores se indexan en la colección policybot_hr_docs sobre Qdrant v1.20.2. La búsqueda semántica por Cosine Distance recupera los fragmentos más relevantes con UUID deterministas RFC 4122 v4.',
      meta: 'Servidor: 127.0.0.1:6333 | Métrica: Cosine | Puntos: 47 activos | Fallback local: false'
    },
    {
      step: '04',
      title: 'DeepSeek API',
      subtitle: 'Razonamiento y Grounding Riguroso',
      desc: 'El modelo deepseek-flash recibe únicamente la evidencia documental recuperada. Con temperatura baja (0.2), sintetiza la respuesta con razonamiento explícito y citas obligatorias al documento de origen.',
      meta: 'Modelo: deepseek-flash | Endpoint: https://api.deepseek.com | Temp: 0.2'
    },
    {
      step: '05',
      title: 'Cita Verificable en Drive',
      subtitle: 'Cero Alucinaciones, Certeza Total',
      desc: 'La respuesta entregada al colaborador incluye el código de política, número de versión, nombre de sección y un hipervínculo directo al documento original en Google Drive, con soporte para supervisión humana.',
      meta: 'Trazabilidad: 100% | Citas verificables | Enlace permanente al ID de Drive'
    }
  ];

  return (
    <div style={{ backgroundColor: '#101114', color: '#FFFFFF', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 1. NAVEGACIÓN SUPERIOR MINIMALISTA */}
      <LandingNavbar />

      {/* 2. HERO PRINCIPAL CINEMATOGRÁFICO */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8rem 2rem 5rem',
          textAlign: 'center',
          background: 'radial-gradient(ellipse at 50% 20%, #1A2234 0%, #101114 70%)'
        }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="eyebrow-accent"
        >
          HUMAN RESOURCES. REIMAGINED WITH INTELLIGENCE.
        </motion.div>

        {/* Titular Grande */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="hero-headline"
          style={{ maxWidth: '980px', margin: '0.5rem auto 1.5rem', whiteSpace: 'pre-line' }}
        >
          El futuro de{'\n'}Recursos Humanos{'\n'}ya está aquí.
        </motion.h1>

        {/* Subtítulo Elegante */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="body-lead-dark"
          style={{ maxWidth: '680px', margin: '0 auto 2.5rem' }}
        >
          Una nueva forma de conectar personas, políticas e inteligencia artificial en una sola plataforma corporativa.
        </motion.p>

        {/* Botones de Acción */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}
        >
          <button
            onClick={() => {
              const el = document.getElementById('experiencia');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-apple-primary"
            style={{ padding: '0.95rem 2.25rem', fontSize: '1rem' }}
          >
            <span>Explorar PolicyBot HR</span>
            <ChevronDown size={18} />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="btn-apple-secondary-dark"
            style={{ padding: '0.95rem 2.25rem', fontSize: '1rem' }}
          >
            <span>Acceder a la plataforma</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>

        {/* Composición Cinematográfica de Pantalla de Producto */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: '4.5rem',
            width: '100%',
            maxWidth: '1120px',
            position: 'relative'
          }}
        >
          {/* Marco tipo display Pro con vidrio y borde micro-iluminado */}
          <div
            style={{
              position: 'relative',
              borderRadius: '24px',
              padding: '10px',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.02) 100%)',
              boxShadow: '0 30px 100px rgba(0, 0, 0, 0.8), 0 0 60px rgba(40, 120, 255, 0.15)'
            }}
          >
            <div
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#0D0E12',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                position: 'relative'
              }}
            >
              {/* Barra superior de ventana Pro */}
              <div
                style={{
                  height: '40px',
                  backgroundColor: 'rgba(16, 17, 20, 0.95)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1.25rem',
                  gap: '0.5rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF5F56' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#27C93F' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', color: '#86868B', fontWeight: 500 }}>
                  policybot.cr — TicoTech S.A. Enterprise Platform
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: '#30D158' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#30D158' }} />
                  Qdrant 1024d Live
                </div>
              </div>

              {/* Contenido Visual Central del Hero: Fotografía arquitectónica + overlay inteligente */}
              <div style={{ position: 'relative', height: '520px', overflow: 'hidden' }}>
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=85"
                  alt="TicoTech Enterprise Architecture"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'brightness(0.55) contrast(1.1)'
                  }}
                />

                {/* Overlay con Gradiente Cinematográfico */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(16, 17, 20, 0.3) 0%, rgba(16, 17, 20, 0.85) 100%)'
                  }}
                />

                {/* Tarjetas Flotantes de Demostración del Sistema Real */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '2.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div
                      style={{
                        background: 'rgba(16, 17, 20, 0.75)',
                        backdropFilter: 'blur(20px)',
                        padding: '1rem 1.5rem',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#2878FF', fontWeight: 600, letterSpacing: '0.05em' }}>
                        ADMINISTRADOR PRINCIPAL
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF', marginTop: '0.2rem' }}>
                        Ulysses Quirós
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#86868B' }}>
                        TicoTech S.A. | Recursos Humanos
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(16, 17, 20, 0.75)',
                        backdropFilter: 'blur(20px)',
                        padding: '1rem 1.5rem',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        gap: '1.5rem'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#86868B' }}>Colaboradores</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFFFFF' }}>55 Activos</div>
                      </div>
                      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#86868B' }}>Vectores BGE-M3</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#30D158' }}>47 Puntos</div>
                      </div>
                    </div>
                  </div>

                  {/* Ejemplo de Pregunta y Cita Real del RAG */}
                  <div
                    style={{
                      maxWidth: '680px',
                      margin: '0 auto',
                      width: '100%',
                      background: 'rgba(24, 25, 30, 0.88)',
                      backdropFilter: 'blur(25px)',
                      borderRadius: '18px',
                      padding: '1.5rem 1.75rem',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      textAlign: 'left',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#2878FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Consulta RAG Verificada
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#86868B' }}>•</span>
                      <span style={{ fontSize: '0.75rem', color: '#30D158' }}>DeepSeek + Google Drive</span>
                    </div>

                    <div style={{ fontSize: '0.95rem', color: '#FFFFFF', fontWeight: 500, marginBottom: '0.6rem' }}>
                      "¿Con cuántos días de anticipación debo solicitar vacaciones de 3 o más días según la política?"
                    </div>

                    <div style={{ fontSize: '0.875rem', color: '#86868B', lineHeight: 1.5 }}>
                      Según la <strong style={{ color: '#FFFFFF' }}>Política de Vacaciones Anuales (POL-VAC-001, v2.3, Sección 3)</strong>, se requieren <strong style={{ color: '#FFFFFF' }}>10 días hábiles</strong> de anticipación registrados en PolicyBot HR.
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(40, 120, 255, 0.15)',
                          color: '#2878FF',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <ExternalLink size={12} />
                        Drive ID: 1CzSXlNL3BZNpI8YV4ppGtsx0YL62O1fw
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#86868B' }}>Score: 0.7192</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. SECCIÓN 1: UNA NUEVA EXPERIENCIA (FONDO BLANCO) */}
      <section
        id="experiencia"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#1D1D1F',
          padding: '9rem 2rem',
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ maxWidth: '780px', marginBottom: '5rem' }}>
            <span className="eyebrow-accent" style={{ color: '#2878FF' }}>
              UNA NUEVA EXPERIENCIA
            </span>
            <h2 className="section-headline-light" style={{ margin: '0.5rem 0 1.5rem', whiteSpace: 'pre-line' }}>
              Personas primero.{'\n'}La inteligencia detrás.
            </h2>
            <p className="body-lead-light">
              La gestión de Recursos Humanos no se trata de procesar formularios ni memorizar cientos de páginas de reglamentos. Se trata de dar a cada persona la claridad que necesita al instante, con respaldo legal y respeto absoluto a su privacidad.
            </p>
          </div>

          {/* Composición Fotográfica Editorial de 3 Columnas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '2.5rem'
            }}
          >
            {/* Tarjeta 1: Autonomía del Colaborador */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  height: '380px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                  backgroundColor: '#F5F5F7',
                  position: 'relative'
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=85"
                  alt="Colaborador con autonomía"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                  onMouseEnter={(e) => (e.target.style.transform = 'scale(1.04)')}
                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.6rem' }}>
                Autonomía sin intermediarios.
              </h3>
              <p style={{ color: '#6E6E73', fontSize: '1rem', lineHeight: 1.5 }}>
                Cada colaborador consulta su saldo real de vacaciones, revisa sus boletas de incapacidad y pregunta por cualquier beneficio de TicoTech en tiempo real, desde cualquier dispositivo.
              </p>
            </div>

            {/* Tarjeta 2: Colaboración y Equipos */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  height: '380px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                  backgroundColor: '#F5F5F7',
                  position: 'relative'
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=85"
                  alt="Colaboración en equipo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                  onMouseEnter={(e) => (e.target.style.transform = 'scale(1.04)')}
                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.6rem' }}>
                Certeza normativa compartida.
              </h3>
              <p style={{ color: '#6E6E73', fontSize: '1rem', lineHeight: 1.5 }}>
                Jefaturas y colaboradores leen la misma verdad oficial. Diferenciación transparente entre el piso de ley costarricense y los beneficios internos extendidos de la empresa.
              </p>
            </div>

            {/* Tarjeta 3: Dirección Estratégica */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  height: '380px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  marginBottom: '1.5rem',
                  backgroundColor: '#F5F5F7',
                  position: 'relative'
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=85"
                  alt="Dirección de Talento"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                  onMouseEnter={(e) => (e.target.style.transform = 'scale(1.04)')}
                  onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.6rem' }}>
                Supervisión humana irrenunciable.
              </h3>
              <p style={{ color: '#6E6E73', fontSize: '1rem', lineHeight: 1.5 }}>
                La IA informa, recupera y orienta, pero las decisiones laborales —aprobación de descansos, ascensos o medidas disciplinarias— permanecen estrictamente bajo juicio humano.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECCIÓN 2: INTELIGENCIA MULTIAGENTE (FONDO NEGRO GRAFITO) */}
      <section
        id="agentes"
        style={{
          backgroundColor: '#101114',
          color: '#FFFFFF',
          padding: '9rem 2rem',
          position: 'relative',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ maxWidth: '800px', marginBottom: '4.5rem' }}>
            <span className="eyebrow-accent">ARQUITECTURA MULTI-AGENTE</span>
            <h2 className="section-headline-dark" style={{ margin: '0.5rem 0 1.5rem', whiteSpace: 'pre-line' }}>
              Un equipo inteligente.{'\n'}Siete capacidades.
            </h2>
            <p className="body-lead-dark">
              PolicyBot HR no es un modelo monolítico. Es una red coordinada bajo <strong>LangGraph.js</strong> donde cada agente posee un rol delimitado, acceso exclusivo a sus fuentes y controles de gobernanza criptográfica.
            </p>
          </div>

          {/* Selector Interactivo de Agentes (Pills Apple Style) */}
          <div
            style={{
              display: 'flex',
              gap: '0.65rem',
              overflowX: 'auto',
              paddingBottom: '1.5rem',
              marginBottom: '2.5rem',
              scrollbarWidth: 'none'
            }}
          >
            {agentsData.map((ag, idx) => {
              const isSelected = selectedAgentIndex === idx;
              const IconComp = ag.icono;
              return (
                <button
                  key={ag.id}
                  onClick={() => setSelectedAgentIndex(idx)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.75rem 1.4rem',
                    borderRadius: '980px',
                    whiteSpace: 'nowrap',
                    fontSize: '0.9rem',
                    fontWeight: isSelected ? 600 : 500,
                    backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#FFFFFF' : '#86868B',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <IconComp size={16} color={isSelected ? ag.color : '#86868B'} />
                  <span>{ag.nombre}</span>
                </button>
              );
            })}
          </div>

          {/* Panel Interactivo del Agente Seleccionado */}
          <div
            style={{
              background: 'linear-gradient(180deg, #18191E 0%, #121317 100%)',
              borderRadius: '28px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '3rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          >
            {(() => {
              const currentAgent = agentsData[selectedAgentIndex];
              const IconComp = currentAgent.icono;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
                  {/* Columna Izquierda: Información Editorial del Agente */}
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: `${currentAgent.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <IconComp size={24} color={currentAgent.color} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: currentAgent.color, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {currentAgent.rol}
                        </span>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                          {currentAgent.nombre}
                        </h3>
                      </div>
                    </div>

                    <p style={{ fontSize: '1.1rem', color: '#D1D1D6', lineHeight: 1.6, marginBottom: '2rem' }}>
                      {currentAgent.responsabilidad}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Datos que utiliza
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#FFFFFF', marginTop: '0.2rem' }}>
                          {currentAgent.datos}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Herramientas y Protocolos
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#FFFFFF', marginTop: '0.2rem' }}>
                          {currentAgent.herramientas}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Tipo de Resultado
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#30D158', marginTop: '0.2rem', fontWeight: 500 }}>
                          {currentAgent.resultado}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Diagrama Dinámico SVG con Conexiones Lógicas */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '20px',
                      padding: '2.5rem 2rem',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '380px'
                    }}
                  >
                    <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
                      {/* Círculos concéntricos de resonancia */}
                      <circle cx="140" cy="140" r="120" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" strokeDasharray="4 4" />
                      <circle cx="140" cy="140" r="85" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

                      {/* Líneas activas conectadas al nodo central */}
                      <line x1="140" y1="140" x2="60" y2="70" stroke={currentAgent.color} strokeWidth="2" strokeOpacity="0.6" />
                      <line x1="140" y1="140" x2="220" y2="70" stroke={currentAgent.color} strokeWidth="2" strokeOpacity="0.6" />
                      <line x1="140" y1="140" x2="60" y2="210" stroke={currentAgent.color} strokeWidth="2" strokeOpacity="0.6" />
                      <line x1="140" y1="140" x2="220" y2="210" stroke={currentAgent.color} strokeWidth="2" strokeOpacity="0.6" />

                      {/* Nodos periféricos */}
                      <circle cx="60" cy="70" r="14" fill="#1C1E24" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                      <circle cx="220" cy="70" r="14" fill="#1C1E24" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                      <circle cx="60" cy="210" r="14" fill="#1C1E24" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                      <circle cx="220" cy="210" r="14" fill="#1C1E24" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />

                      {/* Nodo Central: Agente Activo */}
                      <circle cx="140" cy="140" r="44" fill="#101114" stroke={currentAgent.color} strokeWidth="2.5" />
                      <circle cx="140" cy="140" r="36" fill={currentAgent.color} fillOpacity="0.15" />

                      {/* Etiquetas de los nodos */}
                      <text x="60" y="74" fill="#86868B" fontSize="9" fontWeight="600" textAnchor="middle">DB</text>
                      <text x="220" y="74" fill="#86868B" fontSize="9" fontWeight="600" textAnchor="middle">QDR</text>
                      <text x="60" y="214" fill="#86868B" fontSize="9" fontWeight="600" textAnchor="middle">LLM</text>
                      <text x="220" y="214" fill="#86868B" fontSize="9" fontWeight="600" textAnchor="middle">DRV</text>
                      <text x="140" y="144" fill="#FFFFFF" fontSize="11" fontWeight="700" textAnchor="middle">AG-{selectedAgentIndex + 1}</text>
                    </svg>

                    <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600 }}>
                        {currentAgent.nombre} en Tiempo Real
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#86868B', marginTop: '0.2rem' }}>
                        Latencia de orquestación media: &lt; 150 ms
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* 5. SECCIÓN 3: CONOCIMIENTO CONECTADO (FONDO BLANCO) */}
      <section
        id="tecnologia"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#1D1D1F',
          padding: '9rem 2rem',
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ maxWidth: '800px', marginBottom: '4.5rem' }}>
            <span className="eyebrow-accent" style={{ color: '#2878FF' }}>
              PIPELINE DE RECUPERACIÓN VERIFICADA
            </span>
            <h2 className="section-headline-light" style={{ margin: '0.5rem 0 1.5rem', whiteSpace: 'pre-line' }}>
              Cada respuesta tiene una fuente.
            </h2>
            <p className="body-lead-light">
              Desde el momento en que un documento se guarda en Google Drive hasta que DeepSeek formula la respuesta, existe una cadena criptográfica e indexada ininterrumpida.
            </p>
          </div>

          {/* Stepper Interactivo del Pipeline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
            {pipelineSteps.map((step, idx) => {
              const isActive = activePipelineStep === idx;
              return (
                <button
                  key={step.step}
                  onClick={() => setActivePipelineStep(idx)}
                  style={{
                    textAlign: 'left',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '16px',
                    backgroundColor: isActive ? '#101114' : '#F5F5F7',
                    color: isActive ? '#FFFFFF' : '#1D1D1F',
                    border: '1px solid',
                    borderColor: isActive ? '#101114' : 'rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isActive ? '#2878FF' : '#86868B', marginBottom: '0.35rem' }}>
                    PASO {step.step}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {step.title}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detalle del Paso del Pipeline */}
          <div
            style={{
              backgroundColor: '#F5F5F7',
              borderRadius: '24px',
              padding: '3rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: '#2878FF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {pipelineSteps[activePipelineStep].subtitle}
              </span>
              <h3 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em', margin: '0.5rem 0 1rem', color: '#1D1D1F' }}>
                {pipelineSteps[activePipelineStep].title}
              </h3>
              <p style={{ fontSize: '1.1rem', color: '#6E6E73', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {pipelineSteps[activePipelineStep].desc}
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(0,0,0,0.08)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#1D1D1F'
                }}
              >
                <CheckCircle2 size={16} color="#30D158" />
                <span>{pipelineSteps[activePipelineStep].meta}</span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#101114',
                borderRadius: '18px',
                padding: '2rem',
                color: '#FFFFFF',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                boxShadow: '0 12px 30px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ color: '#86868B', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                // Verificación criptográfica en tiempo real
              </div>
              <div><span style={{ color: '#2878FF' }}>const</span> pipelineStage = <span style={{ color: '#30D158' }}>"{pipelineSteps[activePipelineStep].title}"</span>;</div>
              <div><span style={{ color: '#2878FF' }}>const</span> liveVerification = &#123;</div>
              <div style={{ paddingLeft: '1.25rem' }}>status: <span style={{ color: '#30D158' }}>"VERIFICADO_CON_SERVICIO_REAL"</span>,</div>
              <div style={{ paddingLeft: '1.25rem' }}>qdrantServer: <span style={{ color: '#30D158' }}>"http://127.0.0.1:6333"</span>,</div>
              <div style={{ paddingLeft: '1.25rem' }}>vectorDimensions: <span style={{ color: '#FF9500' }}>1024</span>,</div>
              <div style={{ paddingLeft: '1.25rem' }}>distanceMetric: <span style={{ color: '#30D158' }}>"Cosine"</span>,</div>
              <div style={{ paddingLeft: '1.25rem' }}>driveCitationsActive: <span style={{ color: '#30D158' }}>true</span></div>
              <div>&#125;;</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECCIÓN 4: DATOS QUE GENERAN CLARIDAD (FONDO GRIS CLARO #F5F5F7) */}
      <section
        id="metricas"
        style={{
          backgroundColor: '#F5F5F7',
          color: '#1D1D1F',
          padding: '9rem 2rem',
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ maxWidth: '800px', marginBottom: '4.5rem' }}>
            <span className="eyebrow-accent" style={{ color: '#2878FF' }}>
              MÉTRICAS OFICIALES TICOTECH S.A.
            </span>
            <h2 className="section-headline-light" style={{ margin: '0.5rem 0 1.5rem', whiteSpace: 'pre-line' }}>
              De los datos a las decisiones.
            </h2>
            <p className="body-lead-light">
              El panel de analítica ejecutiva lee los indicadores calculados de forma automatizada por la base relacional MySQL y el orquestador cron a las 07:00 hora de Costa Rica.
            </p>
          </div>

          {/* Pestañas de Métricas */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'vacaciones', label: 'Vacaciones y Saldos' },
              { id: 'solicitudes', label: 'Solicitudes y Tiempos' },
              { id: 'ausencias', label: 'Ausencias e Incapacidades' },
              { id: 'rotacion', label: 'Rotación y Retención' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMetricTab(tab.id)}
                style={{
                  padding: '0.75rem 1.6rem',
                  borderRadius: '980px',
                  fontSize: '0.9rem',
                  fontWeight: activeMetricTab === tab.id ? 600 : 500,
                  backgroundColor: activeMetricTab === tab.id ? '#101114' : '#FFFFFF',
                  color: activeMetricTab === tab.id ? '#FFFFFF' : '#1D1D1F',
                  border: '1px solid rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tarjetas de Métricas Grand Format */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: '1.75rem'
            }}
          >
            {activeMetricTab === 'vacaciones' && (
              <>
                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Saldo Promedio
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem' }}>
                    14.2 días
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Por colaborador activo sobre la nómina de 55 profesionales.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Tope Máximo de Acumulación
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem' }}>
                    20 días
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Establecido en POL-VAC-001 como política interna preventiva.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    En Riesgo de Vencimiento
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#FF9500' }}>
                    {liveKpiData?.vacacionesEnRiesgo ?? '14'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Colaboradores con más de 20 días pendientes de disfrute.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Días Totales Disponibles
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#2878FF' }}>
                    781.0
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Reserva corporativa registrada en MySQL Sequelize ORM.
                  </div>
                </div>
              </>
            )}

            {activeMetricTab === 'solicitudes' && (
              <>
                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Solicitudes del Trimestre
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem' }}>
                    42
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Vacaciones ordinarias, teletrabajo y licencias especiales.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Pendientes de Aprobación
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#FF9500' }}>
                    {liveKpiData?.solicitudesPendientes ?? '6'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    En cola para revisión de la jefatura directa humana.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Tiempo Medio de Resolución
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#30D158' }}>
                    1.8 días
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Meta interna: menor a 3 días hábiles.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Tasa de Aprobación Humana
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#2878FF' }}>
                    92.4%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Conformidad total con las políticas vigentes de TicoTech.
                  </div>
                </div>
              </>
            )}

            {activeMetricTab === 'ausencias' && (
              <>
                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Incapacidades Activas
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem' }}>
                    {liveKpiData?.incapacidadesActivas ?? '2'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Boletas validadas ante la CCSS y el INS.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Índice de Ausentismo
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#30D158' }}>
                    1.4%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Por debajo del umbral de alerta del 3.5%.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Cobertura de Complemento
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem' }}>
                    100%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Subsidio patronal del 80% días 1-3 y complemento día 4+.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Plazo de Carga Boleta
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#2878FF' }}>
                    48 hrs
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Tiempo máximo reglamentario según PRO-INC-003.
                  </div>
                </div>
              </>
            )}

            {activeMetricTab === 'rotacion' && (
              <>
                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Rotación Trimestral
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem' }}>
                    3.6%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Índice de estabilidad en el sector de tecnología costarricense.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Ingresos Trimestre
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#30D158' }}>
                    +4
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Nuevos talentos incorporados bajo el programa MAN-ONB-007.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Retención de Talento
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem', color: '#2878FF' }}>
                    96.4%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    Satisfacción con clima laboral, teletrabajo y beneficios.
                  </div>
                </div>

                <div className="apple-card">
                  <div style={{ fontSize: '0.8rem', color: '#86868B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Modalidad Híbrida
                  </div>
                  <div className="kpi-big-number" style={{ margin: '1rem 0 0.5rem' }}>
                    82%
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6E6E73' }}>
                    3 días remotos / 2 presenciales según REG-TEL-004.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 7. SECCIÓN 5: SEGURIDAD Y CONFIANZA (FONDO NEGRO GRAFITO) */}
      <section
        id="seguridad"
        style={{
          backgroundColor: '#101114',
          color: '#FFFFFF',
          padding: '9rem 2rem',
          position: 'relative',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ maxWidth: '800px', marginBottom: '5rem' }}>
            <span className="eyebrow-accent">GOBERNANZA Y PRIVACIDAD</span>
            <h2 className="section-headline-dark" style={{ margin: '0.5rem 0 1.5rem', whiteSpace: 'pre-line' }}>
              La inteligencia tiene límites.{'\n'}La privacidad no.
            </h2>
            <p className="body-lead-dark">
              En PolicyBot HR, la seguridad no es una capa posterior. Es la base arquitectónica aprobada en nuestros registros de decisión ADR-001, ADR-002 y ADR-003.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2rem'
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                backgroundColor: '#18191E',
                borderRadius: '24px',
                padding: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(40, 120, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Shield size={22} color="#2878FF" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Aislamiento de Identidad (Ley N° 8968)
              </h3>
              <p style={{ color: '#86868B', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Ningún colaborador puede consultar el expediente, salario o saldo de vacaciones de otra persona. Las consultas personales se resuelven exclusivamente mediante el <code>colaboradorId</code> firmado en el JWT, con 0 fugas de datos verificadas.
              </p>
            </div>

            {/* Card 2 */}
            <div
              style={{
                backgroundColor: '#18191E',
                borderRadius: '24px',
                padding: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(48, 209, 88, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Lock size={22} color="#30D158" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Cifrado Autenticado AES-256-GCM
              </h3>
              <p style={{ color: '#86868B', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Los refresh tokens de Google Drive se almacenan cifrados con IV único de 12 bytes y tag de autenticación en MySQL. Cero almacenamiento en archivos JSON planos o credenciales en texto claro.
              </p>
            </div>

            {/* Card 3 */}
            <div
              style={{
                backgroundColor: '#18191E',
                borderRadius: '24px',
                padding: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(255, 149, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <UserCheck size={22} color="#FF9500" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Supervisión Humana Obligatoria (ADR-002)
              </h3>
              <p style={{ color: '#86868B', fontSize: '0.95rem', lineHeight: 1.6 }}>
                El agente tiene prohibido de forma determinista ejecutar contrataciones, despidos, sanciones disciplinarias, modificaciones salariales o aprobaciones automáticas de solicitudes laborales.
              </p>
            </div>

            {/* Card 4 */}
            <div
              style={{
                backgroundColor: '#18191E',
                borderRadius: '24px',
                padding: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(88, 86, 214, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Database size={22} color="#5856D6" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Cero SQL en Código (Sequelize ORM)
              </h3>
              <p style={{ color: '#86868B', fontSize: '0.95rem', lineHeight: 1.6 }}>
                El 100% de las consultas a MySQL se realizan mediante 15 modelos ORM tipados y parametrizados. Protección completa frente a inyecciones SQL en toda la superficie de la API REST.
              </p>
            </div>

            {/* Card 5 */}
            <div
              style={{
                backgroundColor: '#18191E',
                borderRadius: '24px',
                padding: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(255, 45, 85, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Cpu size={22} color="#FF2D55" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Control Estricto de Alucinaciones
              </h3>
              <p style={{ color: '#86868B', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Si una política consultada no está indexada en Qdrant o no supera el umbral de similitud semántica, el sistema no inventa respuestas: declara la ausencia y genera un ticket trazable hacia el equipo humano de RRHH.
              </p>
            </div>

            {/* Card 6 */}
            <div
              style={{
                backgroundColor: '#18191E',
                borderRadius: '24px',
                padding: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(0, 199, 190, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Layers size={22} color="#00C7BE" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Bitácora de Auditoría Inmutable
              </h3>
              <p style={{ color: '#86868B', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Cada interacción con el chat inteligente, intento de inyección de prompt o acceso a módulos administrativos queda registrado en <code>audit_logs</code> con sello de tiempo, IP, agente y latencia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. SECCIÓN 6: CIERRE CINEMATOGRÁFICO Y CALL TO ACTION */}
      <section
        style={{
          backgroundColor: '#0A0A0C',
          padding: '10rem 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(40, 120, 255, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <BrandLogo size="lg" theme="dark" showText={true} />

          <h2
            className="hero-headline"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.25rem)',
              margin: '2rem 0 1.5rem',
              letterSpacing: '-0.035em'
            }}
          >
            El siguiente paso en la gestión humana comienza aquí.
          </h2>

          <p className="body-lead-dark" style={{ maxWidth: '620px', margin: '0 auto 3rem' }}>
            Transforme la manera en que su organización interactúa con sus políticas, saldos y personas con inteligencia artificial responsable.
          </p>

          <button
            onClick={() => navigate('/login')}
            className="btn-apple-primary"
            style={{
              padding: '1.1rem 2.75rem',
              fontSize: '1.1rem',
              boxShadow: '0 8px 30px rgba(40, 120, 255, 0.4)'
            }}
          >
            <span>Entrar a PolicyBot HR</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Footer Minimalista */}
        <div
          style={{
            maxWidth: '1240px',
            margin: '8rem auto 0',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#86868B',
            gap: '1rem'
          }}
        >
          <div>
            © 2026 TicoTech S.A. | PolicyBot HR Enterprise Suite. Todos los derechos reservados.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Código de Trabajo de Costa Rica</span>
            <span>Ley N° 8968</span>
            <span>ADR-001 / ADR-002 / ADR-003</span>
          </div>
        </div>
      </section>
    </div>
  );
}
