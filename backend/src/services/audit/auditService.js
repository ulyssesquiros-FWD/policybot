const hrRepo = require('../db/hrRepository');

/**
 * Servicio central de trazabilidad y auditoría de gobernanza.
 */
async function logEvent({
  usuarioId = null,
  colaboradorId = null,
  rol = 'ANONIMO',
  accion,
  recurso,
  agenteUtilizado = null,
  documentosRecuperados = [],
  tiempoRespuestaMs = 0,
  resultado = 'EXITO',
  detalle = '',
  ipAddress = '127.0.0.1'
}) {
  try {
    return await hrRepo.saveAuditLog({
      usuarioId,
      colaboradorId,
      rol,
      accion,
      recurso,
      agenteUtilizado,
      documentosRecuperados,
      tiempoRespuestaMs,
      resultado,
      detalle,
      ipAddress
    });
  } catch (err) {
    console.error('Error registrando evento de auditoría:', err.message);
    return null;
  }
}

module.exports = { logEvent };
