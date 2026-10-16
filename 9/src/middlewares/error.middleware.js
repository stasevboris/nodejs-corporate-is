import { ProblemDetailsException } from '../errors/problem-details.js';

export function rfc7807ErrorHandler(err, req, res, next) {
  res.setHeader('Content-Type', 'application/problem+json');

  if (err instanceof ProblemDetailsException) {
    return res.status(err.status).json(err.toJSON(req.originalUrl));
  }

  const status = err.statusCode || 500;
  const problem = {
    type: 'about:blank',
    title: status === 500 ? 'Internal Server Error' : (err.name || 'Error'),
    status,
    detail: err.message || 'Произошла непредвиденная ошибка на сервере',
    instance: req.originalUrl
  };

  res.status(status).json(problem);
}
