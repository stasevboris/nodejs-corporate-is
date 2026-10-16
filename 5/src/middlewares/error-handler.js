export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      requestId: req.id,
      status: 404,
      code: 'NOT_FOUND',
      message: `Маршрут ${req.method} ${req.originalUrl} не найден`
    }
  });
}

export function centralizedErrorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  const response = {
    error: {
      requestId: req.id,
      status,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Внутренняя ошибка сервера',
      ...(err.details ? { details: err.details } : {}),
      ...(!isProd && err.stack ? { stack: err.stack.split('\n').map(s => s.trim()) } : {})
    }
  };

  res.status(status).json(response);
}
