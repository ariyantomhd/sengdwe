// src/modules/blog/blog.controller.ts
import { Request, Response } from 'express';
import { blogService } from './blog.service';

export const blogController = {
  async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await blogService.listCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat kategori.';
      res.status(500).json({ success: false, message });
    }
  },

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const created = await blogService.addCategory(req.body);
      res.status(201).json({
        success: true,
        message: 'Kategori blog berhasil dibuat.',
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal membuat kategori.';
      res.status(400).json({ success: false, message });
    }
  },

  async getArticles(req: Request, res: Response): Promise<void> {
    try {
      const category_id =
        typeof req.query.category_id === 'string' ? req.query.category_id : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const articles = await blogService.listArticles({ category_id, status, search });
      res.status(200).json({ success: true, data: articles });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat artikel blog.';
      res.status(500).json({ success: false, message });
    }
  },

  async createArticle(req: Request, res: Response): Promise<void> {
    try {
      const created = await blogService.createArticle(req.body);
      res.status(201).json({
        success: true,
        message: 'Artikel blog berhasil dipublikasikan.',
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan artikel.';
      res.status(400).json({ success: false, message });
    }
  },

  async updateArticle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const updated = await blogService.updateArticle(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Artikel blog berhasil diperbarui.',
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui artikel.';
      res.status(400).json({ success: false, message });
    }
  },

  async deleteArticle(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await blogService.deleteArticle(id);
      res.status(200).json({
        success: true,
        message: 'Artikel blog berhasil dihapus.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus artikel.';
      res.status(400).json({ success: false, message });
    }
  },
};