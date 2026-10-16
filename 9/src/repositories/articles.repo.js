import crypto from 'node:crypto';
import { slugify } from '../utils/slugify.js';

export class ArticlesRepository {
  constructor() {
    this.articles = new Map();
    this.comments = new Map();
    this.seed();
  }

  seed() {
    const id1 = 'e1a2b3c4-1111-4000-8000-000000000001';
    const id2 = 'e1a2b3c4-2222-4000-8000-000000000002';

    const now = new Date().toISOString();

    this.articles.set(id1, {
      id: id1,
      title: 'Введение в архитектуру REST',
      slug: 'vvedenie-v-arhitekturu-rest',
      content: 'REST представляет собой архитектурный стиль взаимодействия систем по протоколу HTTP.',
      summary: 'Базовые концепции и уровни модели Ричардсона',
      author: 'Stefan Architect',
      status: 'published',
      tags: ['rest', 'architecture', 'http'],
      version: 1,
      createdAt: now,
      updatedAt: now
    });

    this.articles.set(id2, {
      id: id2,
      title: 'Управление параллелизмом через ETag',
      slug: 'upravlenie-parallelizmom-cherez-etag',
      content: 'Оптимистическая блокировка предотвращает коллизии Lost Update с помощью If-Match.',
      summary: 'Защита от перезаписи данных в REST API',
      author: 'Stefan Architect',
      status: 'draft',
      tags: ['etag', 'concurrency'],
      version: 1,
      createdAt: now,
      updatedAt: now
    });

    // Seed комментарий
    const cId = 'c1c1c1c1-0000-4000-8000-000000000001';
    this.comments.set(cId, {
      id: cId,
      articleId: id1,
      author: 'Alex Reviewer',
      text: 'Отличная статья, хорошо структурировано!',
      createdAt: now
    });
  }

  findAll(query = {}) {
    let list = Array.from(this.articles.values());

    if (query.status) {
      list = list.filter(a => a.status === query.status);
    }
    if (query.tag) {
      list = list.filter(a => a.tags.includes(query.tag.toLowerCase()));
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
    }

    if (query.sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (query.sort === '-title') list.sort((a, b) => b.title.localeCompare(a.title));
    else if (query.sort === 'createdAt') list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = list.length;
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      items: list.slice(offset, offset + limit)
    };
  }

  findById(id) {
    return this.articles.get(id) || null;
  }

  create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const article = {
      id,
      title: data.title,
      slug: slugify(data.title),
      content: data.content,
      summary: data.summary || '',
      author: data.author,
      status: data.status || 'draft',
      tags: data.tags || [],
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.articles.set(id, article);
    return article;
  }

  update(id, data, currentExpectedVersion = null) {
    const existing = this.articles.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...data,
      slug: data.title ? slugify(data.title) : existing.slug,
      version: existing.version + 1,
      updatedAt: now
    };
    this.articles.set(id, updated);
    return updated;
  }

  delete(id) {
    return this.articles.delete(id);
  }

  // Comments
  findComments(articleId) {
    return Array.from(this.comments.values()).filter(c => c.articleId === articleId);
  }

  createComment(articleId, data) {
    const id = crypto.randomUUID();
    const comment = {
      id,
      articleId,
      author: data.author,
      text: data.text,
      createdAt: new Date().toISOString()
    };
    this.comments.set(id, comment);
    return comment;
  }

  deleteComment(articleId, commentId) {
    const comment = this.comments.get(commentId);
    if (comment && comment.articleId === articleId) {
      return this.comments.delete(commentId);
    }
    return false;
  }
}

export const articlesRepo = new ArticlesRepository();
