const cron = require('node-cron');
const config = require('../../config/env');
const reportsAnalystAgent = require('../../agents/reportsAnalystAgent');
const auditService = require('../audit/auditService');

let scheduledTask = null;
let lastRunAt = null;
let lastStatus = 'PROGRAMADO';

function startReportScheduler() {
  if (scheduledTask) return scheduledTask;

  scheduledTask = cron.schedule(
    config.cron.schedule,
    async () => {
      const start = Date.now();
      try {
        const report = await reportsAnalystAgent.generateDailyReport({
          generadoPor: 'CRON_AUTOMATICO'
        });
        lastRunAt = new Date().toISOString();
        lastStatus = `EXITO (Reporte #${report.id})`;
        await auditService.logEvent({
          rol: 'SISTEMA_CRON',
          accion: 'CRON_REPORTE_DIARIO_0700',
          recurso: 'node-cron',
          agenteUtilizado: 'Agente Analista de Reportes',
          tiempoRespuestaMs: Date.now() - start,
          resultado: 'EXITO',
          detalle: `Reporte diario automático generado para ${report.fecha_reporte}`
        });
      } catch (err) {
        lastRunAt = new Date().toISOString();
        lastStatus = `ERROR: ${err.message}`;
        await auditService.logEvent({
          rol: 'SISTEMA_CRON',
          accion: 'CRON_REPORTE_DIARIO_0700',
          recurso: 'node-cron',
          agenteUtilizado: 'Agente Analista de Reportes',
          tiempoRespuestaMs: Date.now() - start,
          resultado: 'ERROR',
          detalle: err.message
        });
      }
    },
    {
      scheduled: true,
      timezone: config.cron.timezone
    }
  );

  return scheduledTask;
}

function getSchedulerStatus() {
  return {
    active: Boolean(scheduledTask),
    cronExpression: config.cron.schedule,
    timezone: config.cron.timezone,
    description: 'Generación automática diaria a las 07:00 hora de Costa Rica',
    lastRunAt,
    lastStatus
  };
}

module.exports = {
  startReportScheduler,
  getSchedulerStatus
};
