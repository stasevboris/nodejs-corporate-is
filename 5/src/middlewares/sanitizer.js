export function sanitizeTicketBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    if (typeof req.body.title === 'string') {
      req.body.title = req.body.title.trim().replace(/[\x00-\x1F\x7F]/g, '');
    }
    if (typeof req.body.description === 'string') {
      req.body.description = req.body.description.trim();
    }
    if (Array.isArray(req.body.tags)) {
      req.body.tags = req.body.tags
        .filter(t => typeof t === 'string' && t.trim().length > 0)
        .map(t => t.trim().toLowerCase());
    }
  }
  next();
}
