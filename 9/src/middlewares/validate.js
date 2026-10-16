import { ProblemDetailsException } from '../errors/problem-details.js';

export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.validatedBody = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err.errors) {
        const invalidParams = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        return next(new ProblemDetailsException(
          400,
          'Validation Error',
          'Ошибка валидации параметров HTTP-запроса',
          'https://example.com/probs/validation-error',
          invalidParams
        ));
      }
      next(err);
    }
  };
}
