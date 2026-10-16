import { Router } from 'express';
import { articlesController } from '../controllers/articles.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  articleQuerySchema,
  articleParamsSchema,
  articleCreateSchema,
  articleUpdateSchema,
  articlePatchSchema,
  commentCreateSchema
} from '../schemas/article.schema.js';

const router = Router();

router.options('/', articlesController.options);
router.get('/', validate({ query: articleQuerySchema }), articlesController.list);
router.post('/', validate({ body: articleCreateSchema }), articlesController.create);

router.get('/:id', validate({ params: articleParamsSchema }), articlesController.getById);
router.head('/:id', validate({ params: articleParamsSchema }), articlesController.headById);
router.put('/:id', validate({ params: articleParamsSchema, body: articleUpdateSchema }), articlesController.update);
router.patch('/:id', validate({ params: articleParamsSchema, body: articlePatchSchema }), articlesController.patch);
router.delete('/:id', validate({ params: articleParamsSchema }), articlesController.delete);

// Sub-resources: Comments
router.get('/:id/comments', validate({ params: articleParamsSchema }), articlesController.listComments);
router.post('/:id/comments', validate({ params: articleParamsSchema, body: commentCreateSchema }), articlesController.createComment);
router.delete('/:id/comments/:commentId', validate({ params: articleParamsSchema }), articlesController.deleteComment);

export default router;
