const jwt = require('jsonwebtoken');
const config = require('../config/env');
const auditService = require('../services/audit/auditService');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    await auditService.logEvent({
      rol: 'ANONIMO',
      accion: 'ACCESO_SIN_TOKEN',
      recurso: req.originalUrl,
      resultado: 'BLOQUEADO_SEGURIDAD',
      detalle: 'Intento de acceso a endpoint protegido sin token Bearer.',
      ipAddress: req.ip
    });
    return res.status(401).json({
      error: 'No autenticado. Se requiere un token JWT válido.'
    });
  }

  const token = authHeader.slice(7).trim();
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      usuarioId: decoded.usuarioId,
      colaboradorId: decoded.colaboradorId,
      email: decoded.email,
      rol: decoded.rol,
      nombreCompleto: decoded.nombreCompleto,
      departamento: decoded.departamento,
      puesto: decoded.puesto,
      permisos: decoded.permisos || []
    };
    return next();
  } catch (err) {
    await auditService.logEvent({
      rol: 'TOKEN_INVALIDO',
      accion: 'TOKEN_JWT_INVALIDO',
      recurso: req.originalUrl,
      resultado: 'BLOQUEADO_SEGURIDAD',
      detalle: `Token rechazado: ${err.message}`,
      ipAddress: req.ip
    });
    return res.status(401).json({
      error: 'Token inválido o expirado.'
    });
  }
}

module.exports = authMiddleware;
