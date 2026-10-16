import crypto from 'node:crypto';

export class ArticlesRepo {
  constructor() {
    this.articles = new Map();
    // Начальные данные
    this.create({
      title: 'Введение в корпоративные информационные системы',
      content: 'Корпоративные системы обеспечивают интеграцию сквозных бизнес-процессов...',
      author: 'Стасев Б.В.',
      status: 'published',
      tags: ['enterprise', 'architecture', 'nodejs']
    });
  }

  generateETag(article) {
    const raw = `${article.id}:${article.version}:${article.updatedAt}`;
    const hash = crypto.createHash('md5').update(raw).digest('hex').slice(0, 16);
    return `W/"${article.version}-${hash}"`;
  }

  findAll(query = {}) {
    let items = Array.from(this.articles.values());
    if (query.status) items = items.filter(a => a.status === query.status);
    if (query.tag) items = items.filter(a => a.tags.includes(query.tag.toLowerCase()));
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(a => a.title.toLowerCase().includes(s) || a.content.toLowerCase().includes(s));
    }
    return items;
  }

  findById(id) {
    return this.articles.get(id);
  }

  create(data) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const article = {
      id,
      ...data,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.articles.set(id, article);
    return article;
  }

  update(id, data) {
    const existing = this.articles.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...data,
      version: existing.version + 1,
      updatedAt: new Date().toISOString()
    };
    this.articles.set(id, updated);
    return updated;
  }

  delete(id) {
    return this.articles.delete(id);
  }
}

export const articlesRepo = new ArticlesRepo();
