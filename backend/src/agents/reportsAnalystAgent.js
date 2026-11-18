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

function buildCollaboratorDeterministicAnalysis(reportData) {
  const col = reportData.colaborador;
  const kpis = reportData.kpisIndividuales;
  const vacAlert = kpis.excedeTope20Dias
    ? `supera el tope preventivo de 20 días (${kpis.diasVacacionesDisponibles} disponibles), por lo que requiere programación acordada con su jefatura según POL-VAC-001`
    : `se mantiene dentro del rango saludable según POL-VAC-001 (${kpis.diasVacacionesDisponibles} disponibles de ${kpis.diasVacacionesAcumulados} acumulados, ${kpis.tasaUtilizacionVacacionesPct}% disfrutado)`;

  const solLine =
    kpis.solicitudesPendientes > 0
      ? `Mantiene ${kpis.solicitudesPendientes} solicitud(es) pendiente(s) de aprobación humana (total histórico: ${kpis.totalSolicitudes}).`
      : `No presenta solicitudes pendientes de aprobación (total histórico: ${kpis.totalSolicitudes}, ${kpis.solicitudesAprobadas} aprobadas).`;

  const incLine = kpis.incapacidadActiva
    ? `Registra una incapacidad activa en curso (${kpis.totalIncapacidades} boletas y ${kpis.diasIncapacidadAcumulados} días históricos bajo PRO-INC-003).`
    : `Presenta ${kpis.totalIncapacidades} incapacidad(es) registrada(s) y ${kpis.diasIncapacidadAcumulados} días acumulados en historial, sin incapacidades activas actualmente.`;

  return [
    `• Perfil y Antigüedad: ${col.nombreCompleto} (${col.codigo_empleado}) se desempeña como ${col.puesto} en ${col.departamento} bajo modalidad ${col.modalidad}, con ${kpis.antiguedadTexto} de antigüedad desde ${String(col.fecha_ingreso).slice(0, 10)}.`,
    `• Gestión de Vacaciones (POL-VAC-001): Su saldo actual ${vacAlert}.`,
    `• Desempeño OKR (POL-EVA-009): Obtuvo una calificación de ${kpis.scoreDesempeno.toFixed(2)}/5.0 (${kpis.nivelDesempeno}), con próxima evaluación programada para ${String(col.proxima_evaluacion).slice(0, 10)}.`,
    `• Solicitudes e Incapacidades: ${solLine} ${incLine}`,
    `• Interacción PolicyBot y Gobernanza: Ha realizado ${kpis.totalConsultasChat} consulta(s) en el chat con ${kpis.confianzaPromedioChatPct}% de confianza promedio y ${kpis.escalamientosTotal} escalamiento(s). Toda acción administrativa derivada corresponde exclusivamente a la Dirección de RRHH y su jefatura directa.`
  ].join('\n');
}

async function analyzeCollaboratorReport(colaboradorId, focus = 'INTEGRAL') {
  const start = Date.now();
  const reportData = await hrRepo.getCollaboratorIndividualReport(colaboradorId);
  if (!reportData) return null;

  const col = reportData.colaborador;
  const kpis = reportData.kpisIndividuales;

  const compactFacts = {
    codigo: col.codigo_empleado,
    nombreCompleto: col.nombreCompleto,
    departamento: col.departamento,
    puesto: col.puesto,
    modalidad: col.modalidad,
    estado: col.estado,
    fecha_ingreso: col.fecha_ingreso,
    jefeDirecto: col.jefe_nombre ? `${col.jefe_nombre} ${col.jefe_apellidos}` : 'Dirección Ejecutiva',
    kpisIndividuales: kpis,
    ultimasSolicitudes: (reportData.solicitudes || []).slice(0, 5).map((s) => ({
      tipo: s.tipo,
      dias: s.dias_solicitados,
      estado: s.estado,
      fecha_inicio: s.fecha_inicio
    })),
    ultimasIncapacidades: (reportData.incapacidades || []).slice(0, 5).map((i) => ({
      entidad: i.entidad_emisora,
      tipo: i.tipo_incapacidad,
      dias: i.dias_incapacidad,
      estado: i.estado
    }))
  };

  const systemPrompt = `Eres el Agente Analista de Reportes de RRHH de TicoTech S.A.
TAREA: Analizar el expediente individual de un colaborador para la Dirección de RRHH (enfoque: ${focus}).
REGLAS ESTRICTAS:
1. Usa EXCLUSIVAMENTE los datos y cifras del JSON proporcionado. No inventes ni modifiques ningún número.
2. Entrega entre 4 y 5 viñetas concisas en español cubriendo: perfil/antigüedad, salud del saldo de vacaciones (tope interno 20 días POL-VAC-001), desempeño OKR, solicitudes/incapacidades y recomendaciones preventivas.
3. No emitas decisiones laborales automáticas; indica claramente recomendaciones sujetas a criterio humano.`;

  const aiRes = await deepseekService.generateCompletion({
    systemPrompt,
    userPrompt: `Datos verificados del colaborador:\n${JSON.stringify(compactFacts)}`,
    temperature: 0.15,
    maxTokens: 380
  });

  const analisisEjecutivo =
    aiRes.ok && aiRes.content ? aiRes.content.trim() : buildCollaboratorDeterministicAnalysis(reportData);

  return {
    colaboradorId: col.id,
    codigoEmpleado: col.codigo_empleado,
    nombreCompleto: col.nombreCompleto,
    focus,
    fechaAnalisis: new Date().toISOString(),
    modeloIa: aiRes.model || 'deterministic-fallback',
    latenciaMs: Date.now() - start,
    analisisEjecutivo,
    kpisIndividuales: kpis,
    alertas: kpis.alertas
  };
}

function buildDatasetDeterministicAnalysis({ filters, resumenMetricas, porDepartamento, customQuestion }) {
  const topDept = [...porDepartamento].sort((a, b) => b.promedioVacacionesDisponibles - a.promedioVacacionesDisponibles)[0];
  const bestPerfDept = [...porDepartamento].sort((a, b) => b.promedioDesempeno - a.promedioDesempeno)[0];

  const lines = [
    `• Alcance del Segmento (${filters.department} / ${filters.modality}): Se analizaron ${resumenMetricas.totalColaboradores} colaboradores (${resumenMetricas.activos} activos), con una calificación promedio OKR de ${resumenMetricas.promedioDesempeno}/5.0.`,
    `• Balance y Pasivo de Vacaciones: El segmento promedia ${resumenMetricas.promedioVacacionesDisponibles} días disponibles por colaborador (${resumenMetricas.totalVacacionesDisponibles} días acumulados en total), identificando ${resumenMetricas.sobreTope20Dias} colaborador(es) sobre el umbral preventivo de 20 días (POL-VAC-001).`,
    `• Incapacidades y Gestión Pendiente: Se contabilizan ${resumenMetricas.totalDiasIncapacidad} días acumulados de incapacidad y ${resumenMetricas.solicitudesPendientes} solicitud(es) pendiente(s) de aprobación humana.`,
    topDept
      ? `• Hallazgo Comparativo Departamental: ${topDept.departamento} registra el mayor promedio de vacaciones disponibles (${topDept.promedioVacacionesDisponibles} días), mientras ${bestPerfDept?.departamento || topDept.departamento} lidera en desempeño OKR (${bestPerfDept?.promedioDesempeno || resumenMetricas.promedioDesempeno}/5.0).`
      : null,
    customQuestion
      ? `• Atención a Consulta Específica ("${customQuestion}"): Los datos filtrados confirman la necesidad de priorizar planes de disfrute de vacaciones en los colaboradores con >20 días y mantener seguimiento humano sobre las solicitudes pendientes.`
      : `• Recomendación Preventiva RRHH: Coordinar con jefaturas la programación escalonada de vacaciones para los ${resumenMetricas.sobreTope20Dias} casos sobre 20 días y revisar mensualmente las boletas médicas por departamento.`
  ].filter(Boolean);

  return lines.join('\n');
}

async function analyzeOrganizationDataset({
  department = 'TODOS',
  modality = 'TODAS',
  focus = 'GENERAL',
  customQuestion = ''
} = {}) {
  const start = Date.now();
  const [dataset, globalMetrics] = await Promise.all([
    hrRepo.getCollaboratorsDetailedAnalytics(),
    hrRepo.computeHrReportMetrics()
  ]);

  const filtered = dataset.colaboradores.filter((c) => {
    const depOk = !department || department === 'TODOS' || c.departamento === department;
    const modOk = !modality || modality === 'TODAS' || c.modalidad === modality;
    return depOk && modOk;
  });

  const count = filtered.length;
  const totalVacDisp = filtered.reduce((acc, c) => acc + Number(c.dias_disponibles || 0), 0);
  const totalDiasInc = filtered.reduce((acc, c) => acc + Number(c.diasIncapacidadTotal || 0), 0);
  const sumScore = filtered.reduce((acc, c) => acc + Number(c.ultimo_score_desempeno || 0), 0);
  const scoreCount = filtered.filter((c) => Number(c.ultimo_score_desempeno || 0) > 0).length;

  const resumenMetricas = {
    totalColaboradores: count,
    activos: filtered.filter((c) => c.estado === 'ACTIVO').length,
    enVacaciones: filtered.filter((c) => c.estado === 'VACACIONES').length,
    incapacitados: filtered.filter((c) => c.estado === 'INCAPACITADO').length,
    promedioVacacionesDisponibles: count > 0 ? Number((totalVacDisp / count).toFixed(2)) : 0,
    totalVacacionesDisponibles: Number(totalVacDisp.toFixed(1)),
    sobreTope20Dias: filtered.filter((c) => c.excedeTope20Dias).length,
    promedioDesempeno: scoreCount > 0 ? Number((sumScore / scoreCount).toFixed(2)) : 0,
    totalDiasIncapacidad: totalDiasInc,
    solicitudesPendientes: filtered.reduce((acc, c) => acc + Number(c.solicitudesPendientes || 0), 0)
  };

  const payloadForAi = {
    filtrosAplicados: { department, modality, focus, customQuestion },
    resumenSegmento: resumenMetricas,
    comparativaDepartamental: dataset.analytics.porDepartamento,
    comparativaModalidad: dataset.analytics.porModalidad,
    distribucionVacaciones: dataset.analytics.distribucionVacaciones,
    tasaRotacionTrimestralPct: globalMetrics.tasaRotacionTrimestralPct
  };

  const systemPrompt = `Eres el Agente Analista de Datos y Reportes Estratégicos de RRHH de TicoTech S.A.
TAREA: Producir un análisis estadístico comparativo y accionable en español para la Dirección de RRHH.
REGLAS ESTRICTAS:
1. Basa cada afirmación EXCLUSIVAMENTE en las cifras exactas del JSON proporcionado. No inventes números.
2. Si existe "customQuestion", respóndela directamente usando los datos del JSON.
3. Estructura la respuesta en 4 a 6 viñetas claras cubriendo comparativa por departamento/modalidad, riesgos de vacaciones (>20 días según POL-VAC-001), ausentismo/incapacidades y desempeño OKR.
4. Enfatiza que las recomendaciones apoyan la decisión humana de RRHH.`;

  const aiRes = await deepseekService.generateCompletion({
    systemPrompt,
    userPrompt: `Dataset analítico verificado:\n${JSON.stringify(payloadForAi)}`,
    temperature: 0.15,
    maxTokens: 380
  });

  const analisisEjecutivo =
    aiRes.ok && aiRes.content
      ? aiRes.content.trim()
      : buildDatasetDeterministicAnalysis({
          filters: { department, modality },
          resumenMetricas,
          porDepartamento: dataset.analytics.porDepartamento,
          customQuestion
        });

  return {
    fechaAnalisis: new Date().toISOString(),
    filtrosAplicados: { department, modality, focus, customQuestion },
    resumenMetricas,
    analisisEjecutivo,
    porDepartamento: dataset.analytics.porDepartamento,
    porModalidad: dataset.analytics.porModalidad,
    distribucionVacaciones: dataset.analytics.distribucionVacaciones,
    modeloIa: aiRes.model || 'deterministic-fallback',
    latenciaMs: Date.now() - start
  };
}

module.exports = {
  generateDailyReport,
  answerAggregateQuestion,
  buildDeterministicSummary,
  analyzeCollaboratorReport,
  analyzeOrganizationDataset
};
