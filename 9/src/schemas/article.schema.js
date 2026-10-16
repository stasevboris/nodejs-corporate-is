import { z } from 'zod';

export const articleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tag: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'title', '-title']).default('-createdAt')
});

export const articleParamsSchema = z.object({
  id: z.string().uuid({ message: 'Идентификатор статьи должен быть валидным UUID' })
}).passthrough();

export const commentParamsSchema = z.object({
  id: z.string().uuid(),
  commentId: z.string().uuid()
});

export const articleCreateSchema = z.object({
  title: z.string().trim().min(3, 'Длина заголовка минимум 3 символа').max(150),
  content: z.string().trim().min(10, 'Текст статьи должен содержать минимум 10 символов'),
  summary: z.string().trim().max(300).optional(),
  author: z.string().trim().min(2).max(50),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tags: z.array(z.string().trim().toLowerCase()).default([])
});

export const articleUpdateSchema = z.object({
  title: z.string().trim().min(3).max(150),
  content: z.string().trim().min(10),
  summary: z.string().trim().max(300).optional(),
  author: z.string().trim().min(2).max(50),
  status: z.enum(['draft', 'published', 'archived']),
  tags: z.array(z.string().trim().toLowerCase()).default([])
});

export const articlePatchSchema = articleCreateSchema.partial();

export const commentCreateSchema = z.object({
  author: z.string().trim().min(2).max(50),
  text: z.string().trim().min(1).max(1000)
});
