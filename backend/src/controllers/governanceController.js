const db = require('../config/database');
const hrRepo = require('../services/db/hrRepository');
const deepseekService = require('../services/ai/deepseekService');
const qdrantService = require('../services/rag/qdrantService');
const embeddingService = require('../services/rag/embeddingService');
const googleDriveService = require('../services/rag/googleDriveService');
const reportScheduler = require('../services/cron/reportScheduler');

const GOVERNANCE_RULES = [
  { id: 'GOB-01', regla: 'La IA no puede despedir colaboradores ni sugerir terminaciones individuales.', cumplimiento: 'BLOQUEO_ACTIVO' },
  { id: 'GOB-02', regla: 'La IA no puede contratar ni descartar candidatos de forma autónoma.', cumplimiento: 'BLOQUEO_ACTIVO' },
  { id: 'GOB-03', regla: 'La IA no puede imponer sanciones ni amonestaciones disciplinarias.', cumplimiento: 'BLOQUEO_ACTIVO' },
  { id: 'GOB-04', regla: 'La IA no puede modificar salarios, compensaciones ni deducciones.', cumplimiento: 'BLOQUEO_ACTIVO' },
  { id: 'GOB-05', regla: 'La IA no puede aprobar ni rechazar permisos o vacaciones por cuenta propia.', cumplimiento: 'BLOQUEO_ACTIVO' },
  { id: 'GOB-06', regla: 'Toda decisión laboral recae en personas autorizadas (Human-in-the-Loop).', cumplimiento: 'VERIFICADO' }
];

const AGENT_INVENTORY = [
  { id: 'AG-01', nombre: 'Agente Orquestador', rol: 'Clasificación de intención, guardrails y síntesis final única', modelo: 'deepseek-flash + guardrails', estado: 'ACTIVO' },
  { id: 'AG-02', nombre: 'Agente Políticas RAG', rol: 'Recuperación vectorial Qdrant y citas verificables', modelo: 'deepseek-flash + bge-m3', estado: 'ACTIVO' },
  { id: 'AG-03', nombre: 'Agente Datos Colaborador', rol: 'Consulta SQL aislada por JWT del colaborador autenticado', modelo: 'SQL Parametrizado (MySQL)', estado: 'ACTIVO' },
  { id: 'AG-04', nombre: 'Agente Analista de Reportes', rol: '13 indicadores SQL diarios + resumen ejecutivo', modelo: 'SQL + deepseek-flash', estado: 'ACTIVO' },
  { id: 'AG-05', nombre: 'Agente Ingesta y Sincronización', rol: 'Extracción Drive/PDF/MD, chunking 500-1000 tokens y Qdrant', modelo: 'bge-m3 + Google Drive API v3', estado: 'ACTIVO' },
  { id: 'AG-06', nombre: 'Agente Validador', rol: 'Verificación de citas, no fuga de terceros, fidelidad SQL y gobernanza', modelo: 'Reglas deterministas + auditoría', estado: 'ACTIVO' }
];

const PROMPT_VERSIONS = [
  { agente: 'Agente Orquestador', version: 'v1.0', archivo: 'governance/prompt-registry/orchestrator-v1.md', estado: 'PRODUCCION' },
  { agente: 'Agente Políticas RAG', version: 'v1.0', archivo: 'governance/prompt-registry/policies-rag-v1.md', estado: 'PRODUCCION' },
  { agente: 'Agente Datos Colaborador', version: 'v1.0', archivo: 'governance/prompt-registry/employee-data-v1.md', estado: 'PRODUCCION' },
  { agente: 'Agente Analista de Reportes', version: 'v1.0', archivo: 'governance/prompt-registry/reports-analyst-v1.md', estado: 'PRODUCCION' },
  { agente: 'Agente Validador', version: 'v1.0', archivo: 'governance/prompt-registry/validator-v1.md', estado: 'PRODUCCION' }
];

const RISK_REGISTER = [
  { id: 'RSK-01', riesgo: 'Exposición de vacaciones, incapacidades o salarios de terceros', severidad: 'CRÍTICA', mitigacion: 'Identidad exclusiva desde JWT + bloqueo Orquestador + validación Agente Validador', estado: 'MITIGADO' },
  { id: 'RSK-02', riesgo: 'Alucinación de políticas o artículos del Código de Trabajo CR', severidad: 'ALTA', mitigacion: 'Umbral RAG configurable + citas obligatorias + escalamiento humano', estado: 'MITIGADO' },
  { id: 'RSK-03', riesgo: 'Prompt Injection o Inyección SQL en consultas', severidad: 'CRÍTICA', mitigacion: 'Middleware securityInput + consultas parametrizadas + guardrails LangGraph', estado: 'MITIGADO' },
  { id: 'RSK-04', riesgo: 'Toma autónoma de decisiones laborales (despidos/aprobaciones)', severidad: 'CRÍTICA', mitigacion: 'Separación estricta IA informativa vs. flujo humano de aprobación', estado: 'MITIGADO' },
  { id: 'RSK-05', riesgo: 'Alteración numérica en resúmenes ejecutivos de RRHH', severidad: 'MEDIA', mitigacion: '13 KPIs calculados directamente en SQL antes de redactar resumen', estado: 'MITIGADO' },
  { id: 'RSK-06', riesgo: 'Indisponibilidad de APIs externas (DeepSeek, Qdrant, Ollama, Drive)', severidad: 'MEDIA', mitigacion: 'Degradación controlada transparente con espejo local y auditoría', estado: 'MONITOREADO' }
];

async function getGovernanceSummary(req, res, next) {
  try {
    const resultadoFilter = req.query.resultado || null;
    const auditLogs = await hrRepo.listAuditLogs(100, resultadoFilter);

    const integrations = {
      database: db.getDbStatus(),
      deepseek: deepseekService.getServiceStatus(),
      qdrant: await qdrantService.getQdrantStatus(),
      embeddings: embeddingService.getEmbeddingStatus(),
      googleDrive: await googleDriveService.getDriveStatus(),
      cronScheduler: reportScheduler.getSchedulerStatus()
    };

    return res.json({
      rules: GOVERNANCE_RULES,
      agents: AGENT_INVENTORY,
      promptVersions: PROMPT_VERSIONS,
      riskRegister: RISK_REGISTER,
      integrations,
      auditLogs
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getGovernanceSummary
};
