const { Annotation, StateGraph, START, END } = require('@langchain/langgraph');
const orchestratorAgent = require('./orchestratorAgent');
const policiesRagAgent = require('./policiesRagAgent');
const employeeDataAgent = require('./employeeDataAgent');
const reportsAnalystAgent = require('./reportsAnalystAgent');
const validatorAgent = require('./validatorAgent');
const humanEscalationService = require('./humanEscalationService');
const hrRepo = require('../services/db/hrRepository');
const auditService = require('../services/audit/auditService');

/**
 * Grafo Multiagente con LangGraph.js (StateGraph)
 * Nodos:
 * 1. orchestrator_classify -> Clasifica intención y ejecuta guardrails
 * 2. policies_rag -> Recupera políticas desde Qdrant/BGE-M3
 * 3. employee_data -> Consulta expediente propio en MySQL (solo ID del JWT)
 * 4. reports_analyst -> Métricas agregadas SQL para ADMIN_RRHH
 * 5. validator -> Control de citas, aislamiento de terceros, fidelidad numérica y gobernanza
 * 6. orchestrator_synthesize -> Único emisor de la respuesta final y escalamiento si aplica
 */

const AgentState = Annotation.Root({
  question: Annotation(),
  userContext: Annotation(),
  sesionId: Annotation(),
  ipAddress: Annotation(),
  startedAt: Annotation(),
  classification: Annotation(),
  agentesInvocados: Annotation({
    reducer: (prev, next) => [...new Set([...(prev || []), ...(next || [])])],
    default: () => []
  }),
  ragResult: Annotation(),
  employeeResult: Annotation(),
  reportsResult: Annotation(),
  validationResult: Annotation(),
  escalationTicket: Annotation(),
  finalPayload: Annotation()
});

async function nodeClassify(state) {
  const classification = orchestratorAgent.classifyIntent(state.question, state.userContext);
  return {
    classification,
    agentesInvocados: ['Agente Orquestador']
  };
}

async function nodePoliciesRag(state) {
  const ragResult = await policiesRagAgent.queryPolicies(state.question);
  return {
    ragResult,
    agentesInvocados: ['Agente Políticas RAG']
  };
}

async function nodeEmployeeData(state) {
  const employeeResult = await employeeDataAgent.queryOwnEmployeeData({
    authenticatedColaboradorId: state.userContext.colaboradorId,
    question: state.question
  });
  return {
    employeeResult,
    agentesInvocados: ['Agente Datos Colaborador']
  };
}

async function nodeReportsAnalyst(state) {
  const reportsResult = await reportsAnalystAgent.answerAggregateQuestion(state.question);
  return {
    reportsResult,
    agentesInvocados: ['Agente Analista de Reportes']
  };
}

async function nodeValidator(state) {
  const intent = state.classification.intent;
  let draftAnswer = '';
  if (intent === 'POLITICA_RRHH') draftAnswer = state.ragResult?.answerDraft || '';
  else if (intent === 'DATOS_PERSONALES') draftAnswer = state.employeeResult?.answerDraft || '';
  else if (intent === 'REPORTE_RRHH') draftAnswer = state.reportsResult?.answerDraft || '';
  else if (intent === 'MIXTA') {
    draftAnswer = `${state.employeeResult?.answerDraft || ''}\n${state.ragResult?.answerDraft || ''}`;
  } else if (intent === 'SALUDO_ASISTENTE') {
    draftAnswer = 'Respuesta conversacional informativa sobre PolicyBot HR.';
  } else {
    draftAnswer = orchestratorAgent.buildSecurityOrGovernanceRejection(state.classification);
  }

  const validationResult = validatorAgent.validateResponse({
    intent,
    userContext: state.userContext,
    draftAnswer,
    ragResult: state.ragResult,
    employeeResult: state.employeeResult,
    reportsResult: state.reportsResult
  });

  return {
    validationResult,
    agentesInvocados: ['Agente Validador']
  };
}

async function nodeSynthesizeAndPersist(state) {
  const synth = await orchestratorAgent.synthesizeFinalResponse({
    question: state.question,
    classification: state.classification,
    userContext: state.userContext,
    ragResult: state.ragResult,
    employeeResult: state.employeeResult,
    reportsResult: state.reportsResult,
    validationResult: state.validationResult
  });

  const intent = state.classification.intent;
  const isBlocked = ['RESTRINGIDA_SEGURIDAD', 'RESTRINGIDA_GOBERNANZA'].includes(intent);
  const needsEscalation =
    (intent === 'POLITICA_RRHH' || intent === 'MIXTA') && Boolean(state.ragResult?.shouldEscalate);

  let primaryAgent = 'Agente Orquestador';
  if (intent === 'POLITICA_RRHH') primaryAgent = 'Agente Políticas RAG';
  else if (intent === 'DATOS_PERSONALES') primaryAgent = 'Agente Datos Colaborador';
  else if (intent === 'REPORTE_RRHH') primaryAgent = 'Agente Analista de Reportes';
  else if (intent === 'MIXTA') primaryAgent = 'Agente Orquestador (RAG + Datos)';
  else if (intent === 'SALUDO_ASISTENTE') primaryAgent = 'Agente Orquestador (DeepSeek)';

  const citations = state.ragResult?.citations || [];
  const docs = state.ragResult?.retrievedDocuments || [];
  const confidence =
    isBlocked || intent === 'FUERA_DE_ALCANCE' || intent === 'SALUDO_ASISTENTE'
      ? 1.0
      : intent === 'DATOS_PERSONALES' || intent === 'REPORTE_RRHH'
      ? 0.99
      : state.ragResult?.confidence ?? 0.5;

  const latenciaMs = Math.max(1, Date.now() - state.startedAt);

  const savedChat = await hrRepo.saveChatConsultation({
    usuarioId: state.userContext.usuarioId,
    colaboradorId: state.userContext.colaboradorId,
    sesionId: state.sesionId,
    pregunta: state.question,
    intencion: intent,
    temaPrincipal: state.classification.topic,
    agentePrimario: primaryAgent,
    agentesInvocados: state.agentesInvocados,
    respuesta: synth.answer,
    citas: citations,
    documentosRecuperados: docs,
    confianza: confidence,
    resueltaSinEscalamiento: !needsEscalation && !isBlocked,
    escalada: needsEscalation,
    latenciaMs,
    tokensUsados: synth.tokensUsed || 0,
    validacionAprobada: state.validationResult?.approved !== false
  });

  let escalationTicket = null;
  if (needsEscalation) {
    escalationTicket = await humanEscalationService.createEscalationTicket({
      consultaId: savedChat.id,
      colaboradorId: state.userContext.colaboradorId,
      preguntaOriginal: state.question,
      motivo: state.ragResult?.escalationReason || 'Evidencia insuficiente en base documental.',
      categoria: 'POLITICA_NO_ENCONTRADA',
      prioridad: 'MEDIA'
    });
  }

  let auditResult = 'EXITO';
  if (intent === 'RESTRINGIDA_SEGURIDAD') auditResult = 'BLOQUEADO_SEGURIDAD';
  else if (intent === 'RESTRINGIDA_GOBERNANZA') auditResult = 'BLOQUEADO_GOBERNANZA';
  else if (needsEscalation) auditResult = 'ESCALADO';

  await auditService.logEvent({
    usuarioId: state.userContext.usuarioId,
    colaboradorId: state.userContext.colaboradorId,
    rol: state.userContext.rol,
    accion: `CHAT_${intent}`,
    recurso: '/api/chat/query',
    agenteUtilizado: primaryAgent,
    documentosRecuperados: docs,
    tiempoRespuestaMs: latenciaMs,
    resultado: auditResult,
    detalle: `${state.classification.reason}${escalationTicket ? ` | Ticket: ${escalationTicket.ticket_codigo}` : ''}`,
    ipAddress: state.ipAddress
  });

  return {
    escalationTicket,
    finalPayload: {
      consultaId: savedChat.id,
      sesionId: state.sesionId,
      question: state.question,
      intent,
      topic: state.classification.topic,
      primaryAgent,
      agentsInvoked: state.agentesInvocados,
      answer: synth.answer,
      citations,
      retrievedDocuments: docs,
      confidence,
      confidenceLabel:
        confidence >= 0.8 ? 'ALTA' : confidence >= 0.55 ? 'MEDIA' : 'BAJA',
      validation: state.validationResult,
      shouldEscalate: needsEscalation,
      escalationTicket,
      blocked: isBlocked,
      outOfScope: intent === 'FUERA_DE_ALCANCE',
      modelUsed: synth.modelUsed,
      tokensUsed: synth.tokensUsed || 0,
      latencyMs: latenciaMs
    }
  };
}

function routeAfterClassify(state) {
  const intent = state.classification.intent;
  if (intent === 'POLITICA_RRHH') return 'policies_rag';
  if (intent === 'DATOS_PERSONALES') return 'employee_data';
  if (intent === 'MIXTA') return 'employee_data';
  if (intent === 'REPORTE_RRHH') return 'reports_analyst';
  return 'validator';
}

function routeAfterEmployeeData(state) {
  if (state.classification.intent === 'MIXTA') return 'policies_rag';
  return 'validator';
}

const graphBuilder = new StateGraph(AgentState)
  .addNode('orchestrator_classify', nodeClassify)
  .addNode('policies_rag', nodePoliciesRag)
  .addNode('employee_data', nodeEmployeeData)
  .addNode('reports_analyst', nodeReportsAnalyst)
  .addNode('validator', nodeValidator)
  .addNode('orchestrator_synthesize', nodeSynthesizeAndPersist)
  .addEdge(START, 'orchestrator_classify')
  .addConditionalEdges('orchestrator_classify', routeAfterClassify, [
    'policies_rag',
    'employee_data',
    'reports_analyst',
    'validator'
  ])
  .addConditionalEdges('employee_data', routeAfterEmployeeData, ['policies_rag', 'validator'])
  .addEdge('policies_rag', 'validator')
  .addEdge('reports_analyst', 'validator')
  .addEdge('validator', 'orchestrator_synthesize')
  .addEdge('orchestrator_synthesize', END);

const compiledGraph = graphBuilder.compile();

async function runMultiAgentChat({ question, userContext, sesionId = 'default', ipAddress = '127.0.0.1' }) {
  const out = await compiledGraph.invoke({
    question,
    userContext,
    sesionId,
    ipAddress,
    startedAt: Date.now()
  });
  return out.finalPayload;
}

module.exports = {
  runMultiAgentChat,
  compiledGraph
};
