export function loggerMiddleware(req, res, next) {
  const startHrTime = process.hrtime();

  const originalWriteHead = res.writeHead;
  res.writeHead = function (...args) {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${elapsedTimeInMs}ms`);
    }
    return originalWriteHead.apply(this, args);
  };

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    const logMsg = `[${new Date().toISOString()}] [${req.id}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${elapsedTimeInMs}ms)`;
    if (res.statusCode >= 500) {
      console.error(logMsg);
    } else if (res.statusCode >= 400) {
      console.warn(logMsg);
    } else {
      console.log(logMsg);
    }
  });

  next();
}
