import { ValidationError } from '../errors/app-error.js';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

export function validateTicketCreate(req, res, next) {
  const { title, description, priority, status, tags } = req.body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push({ field: 'title', message: 'Поле title обязательно и должно быть непустой строкой' });
  } else if (title.trim().length > 150) {
    errors.push({ field: 'title', message: 'Длина title не должна превышать 150 символов' });
  }

  if (description !== undefined && typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Поле description должно быть строкой' });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    errors.push({ field: 'status', message: `Недопустимый статус. Разрешено: ${VALID_STATUSES.join(', ')}` });
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    errors.push({ field: 'priority', message: `Недопустимый приоритет. Разрешено: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    errors.push({ field: 'tags', message: 'Поле tags должно быть массивом строк' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Ошибки валидации при создании тикета', errors));
  }

  next();
}

export function validateTicketUpdate(req, res, next) {
  const { title, description, priority, status, tags } = req.body || {};
  const errors = [];

  if (req.method === 'PUT') {
    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push({ field: 'title', message: 'Для PUT запроса поле title обязательно' });
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      errors.push({ field: 'status', message: 'Для PUT запроса корректный status обязателен' });
    }
  }

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    errors.push({ field: 'title', message: 'Поле title должно быть непустой строкой' });
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push({ field: 'status', message: `Недопустимый статус. Разрешено: ${VALID_STATUSES.join(', ')}` });
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    errors.push({ field: 'priority', message: `Недопустимый приоритет. Разрешено: ${VALID_PRIORITIES.join(', ')}` });
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    errors.push({ field: 'tags', message: 'Поле tags должно быть массивом строк' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Ошибки валидации при обновлении тикета', errors));
  }

  next();
}
