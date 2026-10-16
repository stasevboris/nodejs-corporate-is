import { ticketsRepo } from '../storage/tickets.repo.js';
import { NotFoundError } from '../errors/app-error.js';

export const ticketsController = {
  list(req, res) {
    const result = ticketsRepo.findAll(req.query);
    res.json(result);
  },

  getById(req, res, next) {
    // req.ticket уже проверен и прикреплен через router.param('id')
    res.json(req.ticket);
  },

  create(req, res) {
    const created = ticketsRepo.create(req.body);
    res.status(201).json(created);
  },

  update(req, res) {
    const updated = ticketsRepo.update(req.ticket.id, req.body);
    res.json(updated);
  },

  patch(req, res) {
    const patched = ticketsRepo.update(req.ticket.id, req.body);
    res.json(patched);
  },

  delete(req, res) {
    ticketsRepo.delete(req.ticket.id);
    res.status(204).end();
  }
};
