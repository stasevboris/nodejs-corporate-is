import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/in-memory-db.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../errors/app-error.js';

const router = Router();
router.use(authenticate);

// GET /api/v1/documents
router.get('/', (req, res) => {
  const user = req.user;
  const docs = Array.from(db.documents.values()).filter(doc => {
    // PUBLIC и INTERNAL доступны всем авторизованным
    if (doc.classification === 'PUBLIC' || doc.classification === 'INTERNAL') {
      return true;
    }
    // CONFIDENTIAL: доступен ADMIN, MANAGER или владельцу (ABAC)
    if (doc.classification === 'CONFIDENTIAL') {
      return user.role === 'ADMIN' || user.role === 'MANAGER' || doc.ownerId === user.id;
    }
    return false;
  });

  res.json({ count: docs.length, items: docs });
});

// GET /api/v1/documents/:id
router.get('/:id', (req, res, next) => {
  const doc = db.documents.get(req.params.id);
  if (!doc) return next(new NotFoundError('Документ не найден'));

  if (doc.classification === 'CONFIDENTIAL') {
    const isAllowed = req.user.role === 'ADMIN' || req.user.role === 'MANAGER' || doc.ownerId === req.user.id;
    if (!isAllowed) {
      return next(new ForbiddenError('Доступ к конфиденциальному документу запрещен'));
    }
  }

  res.json(doc);
});

// POST /api/v1/documents
router.post('/', (req, res, next) => {
  const { title, content, classification = 'INTERNAL' } = req.body || {};

  if (!title || !content) {
    return next(new ValidationError('Поля title и content обязательны'));
  }

  // Создавать CONFIDENTIAL могут только MANAGER и ADMIN
  if (classification === 'CONFIDENTIAL' && req.user.role === 'USER') {
    return next(new ForbiddenError('Пользователи с ролью USER не могут создавать CONFIDENTIAL документы'));
  }

  const newDoc = {
    id: crypto.randomUUID(),
    title,
    content,
    classification,
    ownerId: req.user.id,
    createdAt: new Date().toISOString()
  };

  db.documents.set(newDoc.id, newDoc);
  db.logAudit(req.user.id, 'DOCUMENT_CREATED', 'documents', { docId: newDoc.id, title });

  res.status(201).json(newDoc);
});

// PATCH /api/v1/documents/:id
router.patch('/:id', (req, res, next) => {
  const doc = db.documents.get(req.params.id);
  if (!doc) return next(new NotFoundError('Документ не найден'));

  // Проверка прав (Ownership / RBAC):
  // ADMIN может менять любые
  // MANAGER может менять любые PUBLIC и INTERNAL
  // USER может менять ТОЛЬКО свои
  const isOwner = doc.ownerId === req.user.id;
  const isManagerCanEdit = req.user.role === 'MANAGER' && doc.classification !== 'CONFIDENTIAL';
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isManagerCanEdit && !isAdmin) {
    return next(new ForbiddenError('У вас нет прав на редактирование данного документа'));
  }

  const { title, content } = req.body || {};
  if (title) doc.title = title;
  if (content) doc.content = content;
  doc.updatedAt = new Date().toISOString();

  db.logAudit(req.user.id, 'DOCUMENT_UPDATED', 'documents', { docId: doc.id });
  res.json(doc);
});

// DELETE /api/v1/documents/:id
router.delete('/:id', (req, res, next) => {
  const doc = db.documents.get(req.params.id);
  if (!doc) return next(new NotFoundError('Документ не найден'));

  // Удалять чужой документ может только ADMIN
  const isOwner = doc.ownerId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return next(new ForbiddenError('Удалять документы может только их владелец или администратор'));
  }

  db.documents.delete(req.params.id);
  db.logAudit(req.user.id, 'DOCUMENT_DELETED', 'documents', { docId: req.params.id });
  res.status(204).end();
});

export default router;
