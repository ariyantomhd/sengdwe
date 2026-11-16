// src/modules/deals/deal.controller.ts
import { Request, Response } from 'express';
import { dealService } from './deal.service';
import { CreateDealPayload, UpdateDealPayload } from './deal.repo';

function resolveParamId(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) return rawId[0] || '';
  return typeof rawId === 'string' ? rawId : '';
}

export const dealController = {
  async getAllDeals(req: Request, res: Response): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const deals = await dealService.listDeals({ status, search });
      res.status(200).json({
        success: true,
        data: deals,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar deals.';
      res.status(500).json({ success: false, message });
    }
  },

  async createDeal(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as CreateDealPayload;
      const created = await dealService.createNewDeal(payload);
      res.status(201).json({
        success: true,
        message: 'Promo deal berhasil dibuat dan disinkronkan ke katalog.',
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal membuat deal.';
      res.status(400).json({ success: false, message });
    }
  },

  async updateDeal(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const payload = req.body as UpdateDealPayload;
      const updated = await dealService.updateExistingDeal(id, payload);
      res.status(200).json({
        success: true,
        message: 'Promo deal berhasil diperbarui.',
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui deal.';
      res.status(400).json({ success: false, message });
    }
  },

  async toggleDealStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const updated = await dealService.toggleDealActive(id);
      res.status(200).json({
        success: true,
        message: `Deal ${updated.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`,
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal mengubah status deal.';
      res.status(400).json({ success: false, message });
    }
  },

  async deleteDeal(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      await dealService.removeDeal(id);
      res.status(200).json({
        success: true,
        message: 'Promo deal berhasil dihapus.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus deal.';
      res.status(400).json({ success: false, message });
    }
  },
};