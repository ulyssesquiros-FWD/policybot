const auditService = require('../services/audit/auditService');

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }
    if (!allowedRoles.includes(req.user.rol)) {
      await auditService.logEvent({
        usuarioId: req.user.usuarioId,
        colaboradorId: req.user.colaboradorId,
        rol: req.user.rol,
        accion: 'ACCESO_DENEGADO_RBAC',
        recurso: req.originalUrl,
        resultado: 'BLOQUEADO_SEGURIDAD',
        detalle: `Rol ${req.user.rol} intentó acceder a recurso restringido a [${allowedRoles.join(', ')}].`,
        ipAddress: req.ip
      });
      return res.status(403).json({
        error: 'Acceso denegado. Su rol no tiene permisos para este módulo.'
      });
    }
    return next();
  };
}

module.exports = { requireRole };
