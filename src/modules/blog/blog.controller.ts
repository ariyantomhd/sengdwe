// src/modules/blog/blog.controller.ts
import { Request, Response } from 'express';
import { blogService } from './blog.service';

export const blogController = {
  async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await blogService.listCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load categories.';
      res.status(500).json({ success: false, message });
    }
  },

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const created = await blogService.addCategory(req.body);
      res.status(201).json({
        success: true,
        message: 'Blog category created successfully.',
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create category.';
      res.status(400).json({ success: false, message });
    }
  },

  async getArticles(req: Request, res: Response): Promise<void> {
    try {
      const category_id =
        typeof req.query.category_id === 'string' ? req.query.category_id : undefined;
      const category =
        typeof req.query.category === 'string' ? req.query.category : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const articles = await blogService.listArticles({
        category_id,
        category,
        status,
        search,
      });
      res.status(200).json({ success: true, data: articles });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load blog articles.';
      res.status(500).json({ success: false, message });
    }
  },

  async getArticleBySlug(req: Request, res: Response): Promise<void> {
    try {
      const slug = String(req.params.slug || '');
      const article = await blogService.getArticleDetail(slug);
      res.status(200).json({ success: true, data: article });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Article not found.';
      res.status(404).json({ success: false, message });
    }
  },

  async getComments(req: Request, res: Response): Promise<void> {
    try {
      const articleId = Number(req.params.articleId);
      const comments = await blogService.listComments(articleId);
      res.status(200).json({ success: true, data: comments });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load comments.';
      res.status(400).json({ success: false, message });
    }
  },

  async postComment(req: Request, res: Response): Promise<void> {
    try {
      const articleId = Number(req.params.articleId);
      const created = await blogService.addComment(articleId, req.body || {});
      res.status(201).json({
        success: true,
        message: 'Comment submitted successfully.',
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit comment.';
      res.status(400).json({ success: false, message });
    }
  },

  async createArticle(req: Request, res: Response): Promise<void> {
    try {
      const created = await blogService.createArticle(req.body);
      res.status(201).json({
        success: true,
        message: 'Blog article published successfully.',
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create article.';
      res.status(400).json({ success: false, message });
    }
  },

  async updateArticle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const updated = await blogService.updateArticle(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Blog article updated successfully.',
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update article.';
      res.status(400).json({ success: false, message });
    }
  },

  async deleteArticle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await blogService.deleteArticle(id);
      res.status(200).json({
        success: true,
        message: 'Blog article deleted successfully.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete article.';
      res.status(400).json({ success: false, message });
    }
  },
};