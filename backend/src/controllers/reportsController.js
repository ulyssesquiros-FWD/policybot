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

module.exports = {
  getLatestReportDashboard,
  generateReportNow,
  resolveEscalation
};
