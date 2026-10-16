import { Router } from 'express';
import { ticketsController } from '../controllers/tickets.controller.js';
import { ticketsRepo } from '../storage/tickets.repo.js';
import { validateTicketCreate, validateTicketUpdate } from '../middlewares/validator.js';
import { sanitizeTicketBody } from '../middlewares/sanitizer.js';
import { ValidationError, NotFoundError } from '../errors/app-error.js';

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// router.param('id') перехватывает и валидирует UUID
router.param('id', (req, res, next, id) => {
  if (!UUID_REGEX.test(id)) {
    return next(new ValidationError(`Некорректный формат UUID идентификатора тикета: ${id}`));
  }
  const ticket = ticketsRepo.findById(id);
  if (!ticket) {
    return next(new NotFoundError(`Тикет с ID ${id} не найден`));
  }
  req.ticket = ticket;
  next();
});

router.get('/', ticketsController.list);
router.post('/', validateTicketCreate, sanitizeTicketBody, ticketsController.create);
router.get('/:id', ticketsController.getById);
router.put('/:id', validateTicketUpdate, sanitizeTicketBody, ticketsController.update);
router.patch('/:id', validateTicketUpdate, sanitizeTicketBody, ticketsController.patch);
router.delete('/:id', ticketsController.delete);

export default router;
