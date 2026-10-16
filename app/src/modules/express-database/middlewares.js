import crypto from 'node:crypto';

export function requestIdMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

export function responseTimeMiddleware(req, res, next) {
  const start = process.hrtime();
  const origWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    const diff = process.hrtime(start);
    const ms = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${ms}ms`);
    }
    return origWriteHead.apply(this, args);
  };
  next();
}

export function rfcErrorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const problem = {
    type: `https://enterprise.internal/errors/${status}`,
    title: err.title || (status === 500 ? 'Internal Server Error' : 'Client Error'),
    status,
    detail: err.message,
    instance: req.originalUrl,
    requestId: req.id,
    timestamp: new Date().toISOString()
  };
  if (process.env.NODE_ENV !== 'production' && status === 500) {
    problem.stack = err.stack;
  }
  res.status(status).header('Content-Type', 'application/problem+json').json(problem);
}
