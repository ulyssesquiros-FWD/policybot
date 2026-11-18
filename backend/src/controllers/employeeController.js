const hrRepo = require('../services/db/hrRepository');
const auditService = require('../services/audit/auditService');

async function getMyProfile(req, res, next) {
  try {
    // Seguridad: si un usuario no-admin intenta pasar otro colaborador_id en query/params, bloquear y auditar
    const requestedOtherId = req.query.colaborador_id || req.query.id || req.params.id;
    if (
      requestedOtherId &&
      Number(requestedOtherId) !== Number(req.user.colaboradorId) &&
      req.user.rol !== 'ADMIN_RRHH'
    ) {
      await auditService.logEvent({
        usuarioId: req.user.usuarioId,
        colaboradorId: req.user.colaboradorId,
        rol: req.user.rol,
        accion: 'INTENTO_ACCESO_DATOS_TERCERO',
        recurso: req.originalUrl,
        resultado: 'BLOQUEADO_SEGURIDAD',
        detalle: `Intentó consultar colaborador_id=${requestedOtherId} cuando su identidad autenticada es ${req.user.colaboradorId}.`,
        ipAddress: req.ip
      });
      return res.status(403).json({
        error: 'Acceso denegado. No está autorizado a consultar el expediente de otros colaboradores.'
      });
    }

    // Siempre resolver exclusivamente con el ID verificado del JWT
    const profile = await hrRepo.getCollaboratorCompleteProfile(req.user.colaboradorId);
    if (!profile) {
      return res.status(404).json({ error: 'Expediente del colaborador no encontrado.' });
    }
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
}

async function createMyRequest(req, res, next) {
  try {
    const { tipo, fecha_inicio, fecha_fin, dias_solicitados, motivo } = req.body || {};
    const validTypes = [
      'VACACIONES',
      'PERMISO_CON_GOCE',
      'PERMISO_SIN_GOCE',
      'LICENCIA_PATERNIDAD',
      'LICENCIA_DUELO',
      'CONSTANCIA_SALARIAL',
      'TELETRABAJO'
    ];
    if (!validTypes.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de solicitud inválido.' });
    }
    if (!fecha_inicio || !fecha_fin || !motivo) {
      return res.status(400).json({ error: 'Debe indicar fecha de inicio, fecha de fin y motivo.' });
    }

    const created = await hrRepo.createSolicitud({
      colaboradorId: req.user.colaboradorId,
      tipo,
      fechaInicio: fecha_inicio,
      fechaFin: fecha_fin,
      diasSolicitados: Number(dias_solicitados || 1),
      motivo
    });

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: 'CREAR_SOLICITUD_PERSONAL',
      recurso: '/api/employee/requests',
      resultado: 'EXITO',
      detalle: `Solicitud ${tipo} registrada en estado PENDIENTE para aprobación humana.`,
      ipAddress: req.ip
    });

    return res.status(201).json({
      message: 'Solicitud registrada en estado PENDIENTE. Requiere aprobación de su jefatura humana.',
      solicitud: created
    });
  } catch (err) {
    return next(err);
  }
}

async function listAdminRequests(req, res, next) {
  try {
    const items = await hrRepo.listSolicitudesAdmin();
    return res.json({ solicitudes: items });
  } catch (err) {
    return next(err);
  }
}

async function resolveAdminRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { estado, comentario } = req.body || {};
    if (!['APROBADA', 'RECHAZADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Use APROBADA o RECHAZADA.' });
    }

    const updated = await hrRepo.resolveSolicitud({
      solicitudId: id,
      estado,
      aprobadorId: req.user.colaboradorId,
      comentario
    });
    if (!updated) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    await auditService.logEvent({
      usuarioId: req.user.usuarioId,
      colaboradorId: req.user.colaboradorId,
      rol: req.user.rol,
      accion: `SOLICITUD_${estado}_HUMANO`,
      recurso: req.originalUrl,
      resultado: 'EXITO',
      detalle: `Decisión humana ${estado} sobre solicitud #${id}.`,
      ipAddress: req.ip
    });

    return res.json({ solicitud: updated });
  } catch (err) {
    return next(err);
  }
}

async function listCollaborators(req, res, next) {
  try {
    const list = await hrRepo.listCollaboratorsSummary();
    return res.json({ total: list.length, colaboradores: list });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMyProfile,
  createMyRequest,
  listAdminRequests,
  resolveAdminRequest,
  listCollaborators
};
