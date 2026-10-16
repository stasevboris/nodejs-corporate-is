import { articlesRepo } from '../repositories/articles.repo.js';
import { generateETag } from '../utils/etag.js';
import { ProblemDetailsException } from '../errors/problem-details.js';
import { config } from '../config/env.js';

export const articlesController = {
  // GET /api/v1/articles
  list(req, res) {
    const result = articlesRepo.findAll(req.validatedQuery);
    const { page, limit, totalPages, total, items } = result;

    const baseUrl = `${config.baseUrl}/api/v1/articles`;
    const links = {
      self: `${baseUrl}?page=${page}&limit=${limit}`,
      first: `${baseUrl}?page=1&limit=${limit}`,
      last: `${baseUrl}?page=${totalPages}&limit=${limit}`
    };
    if (page > 1) links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
    if (page < totalPages) links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;

    // RFC 8288 Link header
    const linkHeaders = Object.entries(links).map(([rel, url]) => `<${url}>; rel="${rel}"`);
    res.setHeader('Link', linkHeaders.join(', '));

    res.json({
      total,
      page,
      limit,
      totalPages,
      _links: links,
      items: items.map(item => ({
        ...item,
        _links: {
          self: `${baseUrl}/${item.id}`,
          comments: `${baseUrl}/${item.id}/comments`
        }
      }))
    });
  },

  // GET /api/v1/articles/:id
  getById(req, res, next) {
    const article = articlesRepo.findById(req.params.id);
    if (!article) {
      return next(new ProblemDetailsException(404, 'Article Not Found', `Статья с ID ${req.params.id} не найдена`));
    }

    const etag = generateETag(article);
    res.setHeader('ETag', etag);

    // Conditional GET (If-None-Match)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === '*')) {
      return res.status(304).end();
    }

    res.json({
      ...article,
      _links: {
        self: `${config.baseUrl}/api/v1/articles/${article.id}`,
        comments: `${config.baseUrl}/api/v1/articles/${article.id}/comments`
      }
    });
  },

  // HEAD /api/v1/articles/:id
  headById(req, res, next) {
    const article = articlesRepo.findById(req.params.id);
    if (!article) {
      return res.status(404).end();
    }
    const etag = generateETag(article);
    res.setHeader('ETag', etag);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).end();
  },

  // POST /api/v1/articles
  create(req, res) {
    const created = articlesRepo.create(req.validatedBody);
    const location = `${config.baseUrl}/api/v1/articles/${created.id}`;
    const etag = generateETag(created);

    res.setHeader('Location', location);
    res.setHeader('ETag', etag);
    res.status(201).json({
      ...created,
      _links: {
        self: location,
        comments: `${location}/comments`
      }
    });
  },

  // PUT /api/v1/articles/:id (Idempotent, with Lost Update prevention via If-Match)
  update(req, res, next) {
    const article = articlesRepo.findById(req.params.id);
    if (!article) {
      return next(new ProblemDetailsException(404, 'Article Not Found', `Статья с ID ${req.params.id} не найдена`));
    }

    const ifMatch = req.headers['if-match'];
    if (!ifMatch) {
      return next(new ProblemDetailsException(
        428,
        'Precondition Required',
        'Для обновления статьи методом PUT требуется заголовок If-Match с актуальным ETag'
      ));
    }

    const currentETag = generateETag(article);
    if (ifMatch !== currentETag && ifMatch !== '*') {
      return next(new ProblemDetailsException(
        412,
        'Precondition Failed',
        'Ресурс был изменен параллельным запросом. Предоставленный ETag устарел (Lost Update Defense).'
      ));
    }

    const updated = articlesRepo.update(article.id, req.validatedBody);
    const newETag = generateETag(updated);

    res.setHeader('ETag', newETag);
    res.json(updated);
  },

  // PATCH /api/v1/articles/:id
  patch(req, res, next) {
    const article = articlesRepo.findById(req.params.id);
    if (!article) {
      return next(new ProblemDetailsException(404, 'Article Not Found', `Статья с ID ${req.params.id} не найдена`));
    }

    const updated = articlesRepo.update(article.id, req.validatedBody);
    const newETag = generateETag(updated);
    res.setHeader('ETag', newETag);
    res.json(updated);
  },

  // DELETE /api/v1/articles/:id
  delete(req, res) {
    articlesRepo.delete(req.params.id);
    res.status(204).end();
  },

  // OPTIONS /api/v1/articles
  options(req, res) {
    res.setHeader('Allow', 'GET, POST, OPTIONS, HEAD');
    res.status(204).end();
  },

  // Sub-resource Comments
  listComments(req, res, next) {
    const article = articlesRepo.findById(req.params.id);
    if (!article) {
      return next(new ProblemDetailsException(404, 'Article Not Found', `Статья с ID ${req.params.id} не найдена`));
    }
    const comments = articlesRepo.findComments(article.id);
    res.json({ count: comments.length, items: comments });
  },

  createComment(req, res, next) {
    const article = articlesRepo.findById(req.params.id);
    if (!article) {
      return next(new ProblemDetailsException(404, 'Article Not Found', `Статья с ID ${req.params.id} не найдена`));
    }
    const comment = articlesRepo.createComment(article.id, req.validatedBody);
    res.status(201).json(comment);
  },

  deleteComment(req, res, next) {
    const success = articlesRepo.deleteComment(req.params.id, req.params.commentId);
    if (!success) {
      return next(new ProblemDetailsException(404, 'Comment Not Found', 'Комментарий не найден'));
    }
    res.status(204).end();
  }
};
