// src/modules/blog/blog.route.ts
import { Router } from 'express';
import { blogController } from './blog.controller';

const router = Router();

// Categories
router.get('/categories', blogController.getCategories);
router.post('/categories', blogController.createCategory);

// Articles List & Create
router.get('/', blogController.getArticles);
router.post('/', blogController.createArticle);

// Article Comments
router.get('/:articleId/comments', blogController.getComments);
router.post('/:articleId/comments', blogController.postComment);

// Single Article by Slug or ID
router.get('/:slug', blogController.getArticleBySlug);

// Admin Update & Delete
router.patch('/:id', blogController.updateArticle);
router.delete('/:id', blogController.deleteArticle);

export default router;