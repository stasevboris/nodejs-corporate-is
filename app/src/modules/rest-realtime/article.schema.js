import { z } from 'zod';

export const articleCreateSchema = z.object({
  title: z.string().trim().min(3, 'Заголовок минимум 3 символа').max(150),
  content: z.string().trim().min(10, 'Содержимое минимум 10 символов'),
  author: z.string().trim().min(2).max(50),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  tags: z.array(z.string().trim().toLowerCase()).default([])
});

export const articleUpdateSchema = z.object({
  title: z.string().trim().min(3).max(150),
  content: z.string().trim().min(10),
  status: z.enum(['draft', 'published', 'archived']),
  tags: z.array(z.string().trim().toLowerCase()).default([])
});
