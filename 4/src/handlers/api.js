import { sendJson, sendEmpty, sendError } from '../utils/response.js';
import { parseJsonBody } from '../utils/bodyParser.js';

// Хранилище задач в памяти
let currentId = 1;
const tasks = new Map([
  [1, { id: 1, title: 'Изучить модули Node.js', status: 'done', priority: 'high', createdAt: new Date().toISOString() }],
  [2, { id: 2, title: 'Спроектировать low-level HTTP-сервер', status: 'in_progress', priority: 'critical', createdAt: new Date().toISOString() }],
  [3, { id: 3, title: 'Написать тесты API', status: 'pending', priority: 'medium', createdAt: new Date().toISOString() }]
]);
currentId = 4;

export const apiHandler = {
  // GET /api/tasks
  async list(req, res, params, query) {
    let result = Array.from(tasks.values());

    if (query.status) {
      result = result.filter(t => t.status === query.status);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q));
    }

    sendJson(res, 200, {
      count: result.length,
      items: result
    });
  },

  // GET /api/tasks/:id
  async getOne(req, res, params) {
    const id = parseInt(params.id, 10);
    const task = tasks.get(id);
    if (!task) {
      return sendError(res, 404, `Задача с ID ${id} не найдена`, 'TASK_NOT_FOUND');
    }
    sendJson(res, 200, task);
  },

  // POST /api/tasks
  async create(req, res) {
    try {
      const body = await parseJsonBody(req);
      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        return sendError(res, 400, 'Поле "title" обязательно и должно быть непустой строкой', 'VALIDATION_ERROR');
      }

      const newTask = {
        id: currentId++,
        title: body.title.trim(),
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      tasks.set(newTask.id, newTask);
      sendJson(res, 201, newTask);
    } catch (err) {
      sendError(res, err.statusCode || 500, err.message, err.code || 'SERVER_ERROR');
    }
  },

  // PUT /api/tasks/:id (полная замена)
  async update(req, res, params) {
    const id = parseInt(params.id, 10);
    if (!tasks.has(id)) {
      return sendError(res, 404, `Задача с ID ${id} не найдена`, 'TASK_NOT_FOUND');
    }

    try {
      const body = await parseJsonBody(req);
      if (!body.title || !body.status) {
        return sendError(res, 400, 'Для PUT обновления требуются поля title и status', 'VALIDATION_ERROR');
      }

      const existing = tasks.get(id);
      const updated = {
        ...existing,
        title: body.title.trim(),
        status: body.status,
        priority: body.priority || existing.priority,
        updatedAt: new Date().toISOString()
      };

      tasks.set(id, updated);
      sendJson(res, 200, updated);
    } catch (err) {
      sendError(res, err.statusCode || 500, err.message, err.code || 'SERVER_ERROR');
    }
  },

  // PATCH /api/tasks/:id (частичное обновление)
  async patch(req, res, params) {
    const id = parseInt(params.id, 10);
    const existing = tasks.get(id);
    if (!existing) {
      return sendError(res, 404, `Задача с ID ${id} не найдена`, 'TASK_NOT_FOUND');
    }

    try {
      const body = await parseJsonBody(req);
      const patched = {
        ...existing,
        ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        updatedAt: new Date().toISOString()
      };

      tasks.set(id, patched);
      sendJson(res, 200, patched);
    } catch (err) {
      sendError(res, err.statusCode || 500, err.message, err.code || 'SERVER_ERROR');
    }
  },

  // DELETE /api/tasks/:id
  async delete(req, res, params) {
    const id = parseInt(params.id, 10);
    if (!tasks.has(id)) {
      return sendError(res, 404, `Задача с ID ${id} не найдена`, 'TASK_NOT_FOUND');
    }
    tasks.delete(id);
    sendEmpty(res, 204);
  }
};
