const auditService = require('../services/audit/auditService');

/**
 * Middleware de seguridad contra XSS, Inyección SQL en parámetros y validación de entradas.
 */

const SQL_INJECTION_RX = /(\b(union\s+select|drop\s+table|alter\s+table|delete\s+from|insert\s+into|;\s*--|\bor\s+1\s*=\s*1)\b)/i;

function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, (ch) => (ch === '<' ? '&lt;' : '&gt;'))
    .trim();
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = sanitizeString(v);
    else if (typeof v === 'object' && v !== null) out[k] = sanitizeObject(v);
    else out[k] = v;
  }
  return out;
}

async function securityInputMiddleware(req, res, next) {
  // Verificar patrones de inyección SQL en body, query o params
  const payloads = [
    JSON.stringify(req.query || {}),
    JSON.stringify(req.params || {}),
    // En el endpoint de chat las preguntas pueden ser evaluadas por el Orquestador y registradas en audit_logs,
    // pero en rutas de datos/login/solicitudes bloqueamos de inmediato a nivel HTTP 400.
    req.path.includes('/chat/') ? '' : JSON.stringify(req.body || {})
  ].join(' ');

  if (SQL_INJECTION_RX.test(payloads)) {
    await auditService.logEvent({
      usuarioId: req.user?.usuarioId || null,
      colaboradorId: req.user?.colaboradorId || null,
      rol: req.user?.rol || 'ANONIMO',
      accion: 'INTENTO_SQL_INJECTION_HTTP',
      recurso: req.originalUrl,
      resultado: 'BLOQUEADO_SEGURIDAD',
      detalle: 'Patrón sospechoso de inyección SQL bloqueado en middleware HTTP.',
      ipAddress: req.ip
    });
    return res.status(400).json({
      error: 'Entrada rechazada por validación de seguridad.'
    });
  }

  if (req.body && typeof req.body === 'object' && !req.is('multipart/form-data')) {
    req.body = sanitizeObject(req.body);
  }
  return next();
}

module.exports = {
  securityInputMiddleware,
  sanitizeString
};
