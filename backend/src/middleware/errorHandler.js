function errorHandler(err, req, res, _next) {
  console.error(`[Error ${req.method} ${req.originalUrl}]:`, err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor. Consulte la bitácora de auditoría.' : err.message
  });
}

module.exports = errorHandler;
