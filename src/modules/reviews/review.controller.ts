// src/modules/reviews/review.controller.ts
import { Request, Response } from 'express';
import { reviewService } from './review.service';
import { CreateInjectedReviewPayload, UpdateReviewPayload } from './review.repo';

function resolveParamId(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) return rawId[0] || '';
  return typeof rawId === 'string' ? rawId : '';
}

export const reviewController = {
  async getAllReviews(req: Request, res: Response): Promise<void> {
    try {
      const product_id =
        typeof req.query.product_id === 'string' ? req.query.product_id : undefined;
      const source = typeof req.query.source === 'string' ? req.query.source : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const items = await reviewService.listReviews({ product_id, source, status, search });
      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar review.';
      res.status(500).json({ success: false, message });
    }
  },

  async createInjectedReview(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as CreateInjectedReviewPayload;
      const created = await reviewService.injectReview(payload);
      res.status(201).json({
        success: true,
        message: 'Review marketing berhasil disuntikkan dan rating produk diperbarui.',
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menambahkan review.';
      res.status(400).json({ success: false, message });
    }
  },

  async updateReview(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const payload = req.body as UpdateReviewPayload;
      const updated = await reviewService.updateExistingReview(id, payload);
      res.status(200).json({
        success: true,
        message: 'Data review berhasil diperbarui.',
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui review.';
      res.status(400).json({ success: false, message });
    }
  },

  async toggleApproval(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const updated = await reviewService.toggleReviewVisibility(id);
      res.status(200).json({
        success: true,
        message: updated.is_approved ? 'Review ditampilkan ke publik.' : 'Review disembunyikan.',
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal mengubah status review.';
      res.status(400).json({ success: false, message });
    }
  },

  async deleteReview(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      await reviewService.removeReview(id);
      res.status(200).json({
        success: true,
        message: 'Review berhasil dihapus dan rating produk disinkronkan.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus review.';
      res.status(400).json({ success: false, message });
    }
  },
};