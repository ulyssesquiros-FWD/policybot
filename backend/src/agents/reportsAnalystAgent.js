const hrRepo = require('../services/db/hrRepository');
const deepseekService = require('../services/ai/deepseekService');

/**
 * Agente 4: Analista de Reportes RRHH
 * - Ejecuta los 13 indicadores SQL directamente sobre MySQL (o snapshot relacional equivalente)
 * - Utiliza DeepSeek EXCLUSIVAMENTE para redactar el resumen ejecutivo de 3 a 5 frases basado en los datos SQL
 * - Nunca inventa ni altera cifras numéricas
 */

function buildDeterministicSummary(m) {
  const ausenciasCount = (m.ausenciasActualesPorTipoYDepto || []).reduce((a, b) => a + Number(b.total || 0), 0);
  const topTema = m.top5TemasConsultados?.[0]?.tema || 'Vacaciones';

  return [
    `Al cierre del análisis diario, TicoTech S.A. cuenta con ${m.colaboradoresActivos} colaboradores activos (de ${m.totalColaboradores} registros totales), registrando ${ausenciasCount} ausencias vigentes y ${m.incapacidadesActivasTotal} incapacidades activas (${m.incapacidadesMesTotal} acumuladas en el mes).`,
    `Existen ${m.solicitudesPendientesTotal} solicitudes pendientes de aprobación humana, de las cuales ${m.solicitudesPendientesMas3Dias.length} superan los tres días de espera, y ${m.vacacionesSuperiores20DiasTotal} colaboradores superan los 20 días de vacaciones acumuladas.`,
    `En movilidad de personal de los últimos tres meses se reportan ${m.movimientosUltimos3Meses.ingresos} ingresos y ${m.movimientosUltimos3Meses.salidas} salidas, equivalente a una tasa de rotación trimestral del ${m.tasaRotacionTrimestralPct}%.`,
    `El asistente PolicyBot HR ha atendido ${m.chatbotConsultasTotal} consultas con un ${m.chatbotResolucionSinEscalamientoPct}% de resolución sin escalamiento y ${m.chatbotLatenciaPromedioMs} ms de latencia promedio, destacando "${topTema}" como tema principal y manteniendo ${m.preguntasNoResueltasTotal} escalaciones abiertas para seguimiento humano.`
  ].join(' ');
}

async function generateDailyReport({ generadoPor = 'MANUAL_RRHH', fechaOverride = null } = {}) {
  const start = Date.now();
  const metricas = await hrRepo.computeHrReportMetrics();

  const systemPrompt = `Eres el Agente Analista de Reportes de RRHH de TicoTech S.A.
TAREA: Redactar un resumen ejecutivo profesional de exactamente 3 a 5 frases en español utilizando EXCLUSIVAMENTE las cifras exactas del JSON proporcionado.
REGLAS ESTRICTAS:
1. NO inventes, redondees arbitrariamente ni modifiques ningún número del JSON.
2. Incluye al menos: colaboradores activos, ausencias/incapacidades, solicitudes pendientes > 3 días, tasa de rotación, vacaciones > 20 días y desempeño del chatbot.`;

  const aiRes = await deepseekService.generateCompletion({
    systemPrompt,
    userPrompt: `Indicadores SQL verificados:\n${JSON.stringify(metricas, null, 2)}`,
    temperature: 0.1,
    maxTokens: 400
  });

  const resumenEjecutivo =
    aiRes.ok && aiRes.content ? aiRes.content.trim() : buildDeterministicSummary(metricas);

  const fechaReporte = fechaOverride || new Date().toISOString().slice(0, 10);
  const latenciaMs = Date.now() - start;

  const saved = await hrRepo.saveDailyReport({
    fechaReporte,
    generadoPor,
    metricas,
    resumenEjecutivo,
    modeloIa: aiRes.model,
    latenciaMs
  });

  return saved;
}

async function answerAggregateQuestion(question) {
  const metricas = await hrRepo.computeHrReportMetrics();
  const qLower = String(question || '').toLowerCase();

  let answer = '';
  if (/rotacion|ingreso|salida/i.test(qLower)) {
    answer = `En los últimos 3 meses se registran **${metricas.movimientosUltimos3Meses.ingresos} ingresos** y **${metricas.movimientosUltimos3Meses.salidas} salidas**, con una **tasa de rotación trimestral del ${metricas.tasaRotacionTrimestralPct}%** sobre ${metricas.colaboradoresActivos} colaboradores activos.`;
  } else if (/20\s*d[ií]as|vacaciones\s*acumuladas/i.test(qLower)) {
    const names = metricas.vacacionesSuperiores20DiasDetalle
      .slice(0, 6)
      .map((v) => `${v.nombre} ${v.apellidos} (${v.departamento}: ${v.dias_disponibles} días)`)
      .join(', ');
    answer = `Actualmente hay **${metricas.vacacionesSuperiores20DiasTotal} colaboradores** con más de 20 días de vacaciones acumuladas/disponibles. Primeros registros: ${names}.`;
  } else if (/pendiente|3\s*d[ií]as/i.test(qLower)) {
    answer = `Hay **${metricas.solicitudesPendientesTotal} solicitudes pendientes**, de las cuales **${metricas.solicitudesPendientesMas3Dias.length} tienen más de 3 días** de espera para resolución humana.`;
  } else if (/incapacidad|ausencia/i.test(qLower)) {
    answer = `Se contabilizan **${metricas.incapacidadesActivasTotal} incapacidades activas** y **${metricas.incapacidadesMesTotal} incapacidades acumuladas en el mes** (${metricas.incapacidadesMesDias} días totales).`;
  } else {
    answer = buildDeterministicSummary(metricas);
  }

  return {
    agent: 'Agente Analista de Reportes',
    confidence: 0.99,
    answerDraft: answer,
    metricsSummary: metricas
  };
}

module.exports = {
  generateDailyReport,
  answerAggregateQuestion,
  buildDeterministicSummary
};
