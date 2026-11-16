// src/modules/blog/blog.route.ts
import { Router } from 'express';
import { blogController } from './blog.controller';

const router = Router();

router.get('/categories', blogController.getCategories);
router.post('/categories', blogController.createCategory);

router.get('/', blogController.getArticles);
router.post('/', blogController.createArticle);
router.patch('/:id', blogController.updateArticle);
router.delete('/:id', blogController.deleteArticle);

export default router;