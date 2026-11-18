const hrRepo = require('../services/db/hrRepository');

/**
 * Servicio de Escalamiento Humano a RRHH
 * Crea tickets trazables en escalaciones_rrhh cuando la evidencia es insuficiente
 * o cuando el usuario solicita atención personalizada.
 */

async function createEscalationTicket({
  consultaId = null,
  colaboradorId,
  preguntaOriginal,
  motivo = 'Evidencia documental insuficiente en políticas indexadas.',
  categoria = 'CONSULTA_POLITICA',
  prioridad = 'MEDIA'
}) {
  const ticket = await hrRepo.createEscalation({
    consultaId,
    colaboradorId,
    preguntaOriginal,
    motivo,
    categoria,
    prioridad
  });
  return ticket;
}

module.exports = {
  createEscalationTicket
};
