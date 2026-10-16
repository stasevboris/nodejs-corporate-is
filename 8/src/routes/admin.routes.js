import { Router } from 'express';
import { db } from '../db/in-memory-db.js';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.use(authorizeRoles('ADMIN'));

// GET /api/v1/users
router.get('/users', (req, res) => {
  const usersList = Array.from(db.users.values()).map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt
  }));
  res.json({ count: usersList.length, items: usersList });
});

// GET /api/v1/audit-logs
router.get('/audit-logs', (req, res) => {
  res.json({ count: db.auditLogs.length, items: db.auditLogs });
});

export default router;
