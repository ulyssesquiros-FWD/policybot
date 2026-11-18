const hrRepo = require('../services/db/hrRepository');
const reportsAnalystAgent = require('../agents/reportsAnalystAgent');
const reportScheduler = require('../services/cron/reportScheduler');
const auditService = require('../services/audit/auditService');

async function getLatestReportDashboard(req, res, next) {
  try {
    const reports = await hrRepo.listDailyReports(15);
    const escalations = await hrRepo.listEscalations();
    const latestReport = reports[0] || null;
    return res.json({
      latestReport,
      history: reports,
      escalations,
      scheduler: reportScheduler.getSchedulerStatus()
    });
  } catch (err) {
    return next(err);
  }
}

async function generateReportNow(req, res, next) {
  try {
    const report = await reportsAnalystAgent.generateDailyReport({
      generadoPor: 'MANUAL_RRHH'
    });

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'GENERAR_REPORTE_MANUAL',
      recurso: '/api/reports/generate',
      agenteUtilizado: 'Agente Analista de Reportes',
      tiempoRespuestaMs: report.latencia_ms,
      resultado: 'EXITO',
      detalle: `Reporte diario #${report.id} generado manualmente desde dashboard RRHH.`,
      ipAddress: req.ip
    });

    return res.status(201).json({ report });
  } catch (err) {
    return next(err);
  }
}

async function resolveEscalation(req, res, next) {
  try {
    const { id } = req.params;
    const { estado, respuesta_rrhh } = req.body || {};
    const updated = await hrRepo.resolveEscalation({
      id,
      estado: estado || 'RESUELTO',
      respuestaRrhh: respuesta_rrhh
    });
    if (!updated) {
      return res.status(404).json({ error: 'Ticket de escalamiento no encontrado.' });
    }

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'RESOLVER_ESCALACION_RRHH',
      recurso: req.originalUrl,
      resultado: 'EXITO',
      detalle: `Ticket #${id} actualizado a estado ${updated.estado}.`,
      ipAddress: req.ip
    });

    return res.json({ escalation: updated });
  } catch (err) {
    return next(err);
  }
}

async function getCollaboratorsAnalytics(req, res, next) {
  try {
    const data = await hrRepo.getCollaboratorsDetailedAnalytics();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function getCollaboratorIndividualReport(req, res, next) {
  try {
    const { id } = req.params;
    const report = await hrRepo.getCollaboratorIndividualReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Colaborador no encontrado.' });
    }

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'CONSULTA_REPORTE_INDIVIDUAL_RRHH',
      recurso: req.originalUrl,
      resultado: 'EXITO',
      detalle: `Consulta de reporte individual 360° para colaborador #${id} (${report.colaborador.codigo_empleado}).`,
      ipAddress: req.ip
    });

    return res.json({ report });
  } catch (err) {
    return next(err);
  }
}

async function analyzeCollaboratorWithAi(req, res, next) {
  try {
    const { id } = req.params;
    const { focus } = req.body || {};
    const analysis = await reportsAnalystAgent.analyzeCollaboratorReport(id, focus || 'INTEGRAL');
    if (!analysis) {
      return res.status(404).json({ error: 'Colaborador no encontrado.' });
    }

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'ANALISIS_IA_COLABORADOR_INDIVIDUAL',
      recurso: req.originalUrl,
      agenteUtilizado: 'Agente Analista de Reportes',
      tiempoRespuestaMs: analysis.latenciaMs,
      resultado: 'EXITO',
      detalle: `Análisis IA (${analysis.modeloIa}) generado para colaborador #${id}.`,
      ipAddress: req.ip
    });

    return res.json({ analysis });
  } catch (err) {
    return next(err);
  }
}

async function analyzeOrganizationDataWithAi(req, res, next) {
  try {
    const { department, modality, focus, customQuestion } = req.body || {};
    const analysis = await reportsAnalystAgent.analyzeOrganizationDataset({
      department,
      modality,
      focus,
      customQuestion
    });

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'ANALISIS_IA_DATASET_RRHH',
      recurso: req.originalUrl,
      agenteUtilizado: 'Agente Analista de Reportes',
      tiempoRespuestaMs: analysis.latenciaMs,
      resultado: 'EXITO',
      detalle: `Análisis estratégico RRHH generado (depto=${department || 'TODOS'}, modalidad=${modality || 'TODAS'}).`,
      ipAddress: req.ip
    });

    return res.json({ analysis });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getLatestReportDashboard,
  generateReportNow,
  resolveEscalation,
  getCollaboratorsAnalytics,
  getCollaboratorIndividualReport,
  analyzeCollaboratorWithAi,
  analyzeOrganizationDataWithAi
};
