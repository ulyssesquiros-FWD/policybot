const langgraphWorkflow = require('../agents/langgraphWorkflow');
const humanEscalationService = require('../agents/humanEscalationService');
const hrRepo = require('../services/db/hrRepository');
const auditService = require('../services/audit/auditService');

async function queryChat(req, res, next) {
  try {
    const { question, sesionId } = req.body || {};
    if (!question || String(question).trim().length < 3) {
      return res.status(400).json({ error: 'Ingrese una pregunta válida de al menos 3 caracteres.' });
    }

    // Seguridad: nunca utilizar un colaboradorId enviado desde el body; usar únicamente req.user del JWT
    const result = await langgraphWorkflow.runMultiAgentChat({
      question: String(question).trim(),
      userContext: req.user,
      sesionId: sesionId || `sess-${req.user.usuarioId}`,
      ipAddress: req.ip
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function getHistory(req, res, next) {
  try {
    const history = await hrRepo.getChatHistoryByUser(req.user.usuarioId, 40);
    return res.json({ history });
  } catch (err) {
    return next(err);
  }
}

async function manualEscalate(req, res, next) {
  try {
    const { consultaId, question, motivo } = req.body || {};
    if (!question) {
      return res.status(400).json({ error: 'Se requiere la consulta original para crear el ticket.' });
    }

    const ticket = await humanEscalationService.createEscalationTicket({
      consultaId: consultaId || null,
      colaboradorId: req.user.colaboradorId,
      preguntaOriginal: question,
      motivo: motivo || 'Escalamiento manual solicitado por el colaborador desde el chat.',
      categoria: 'ATENCION_HUMANA_RRHH',
      prioridad: 'MEDIA'
    });

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'ESCALAMIENTO_MANUAL_RRHH',
      recurso: '/api/chat/escalate',
      agenteUtilizado: 'Servicio Escalamiento Humano',
      resultado: 'ESCALADO',
      detalle: `Ticket ${ticket.ticket_codigo} creado manualmente.`,
      ipAddress: req.ip
    });

    return res.status(201).json({ ticket });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  queryChat,
  getHistory,
  manualEscalate
};
