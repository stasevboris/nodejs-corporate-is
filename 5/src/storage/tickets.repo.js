import crypto from 'node:crypto';

export class TicketsRepository {
  constructor() {
    this.tickets = new Map();
    this._seed();
  }

  _seed() {
    const id1 = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const id2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

    this.tickets.set(id1, {
      id: id1,
      title: 'Ошибка подключения к почтовому серверу',
      description: 'Пользователи не получают уведомления SMTP',
      priority: 'high',
      status: 'open',
      tags: ['smtp', 'mail', 'infrastructure'],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    });

    this.tickets.set(id2, {
      id: id2,
      title: 'Обновить сертификат SSL',
      description: 'Срок действия сертификата истекает через 5 дней',
      priority: 'critical',
      status: 'in_progress',
      tags: ['ssl', 'security'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  findAll(query = {}) {
    let items = Array.from(this.tickets.values());

    if (query.status) {
      items = items.filter(t => t.status === query.status);
    }
    if (query.priority) {
      items = items.filter(t => t.priority === query.priority);
    }
    if (query.tag) {
      items = items.filter(t => t.tags.includes(query.tag.toLowerCase()));
    }
    if (query.q) {
      const q = query.q.toLowerCase();
      items = items.filter(t => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }

    const total = items.length;
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const paginatedItems = items.slice(offset, offset + limit);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: paginatedItems
    };
  }

  findById(id) {
    return this.tickets.get(id) || null;
  }

  create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newTicket = {
      id,
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: data.status || 'open',
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now
    };
    this.tickets.set(id, newTicket);
    return newTicket;
  }

  update(id, data) {
    const existing = this.tickets.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      priority: data.priority ?? existing.priority,
      status: data.status ?? existing.status,
      tags: data.tags ?? existing.tags,
      updatedAt: new Date().toISOString()
    };
    this.tickets.set(id, updated);
    return updated;
  }

  delete(id) {
    return this.tickets.delete(id);
  }
}

export const ticketsRepo = new TicketsRepository();
