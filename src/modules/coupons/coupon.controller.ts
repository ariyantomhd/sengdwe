// src/modules/coupons/coupon.controller.ts
import { Request, Response } from 'express';
import { couponService } from './coupon.service';
import { CreateCouponPayload, UpdateCouponPayload } from './coupon.repo';

function resolveParamId(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) return rawId[0] || '';
  return typeof rawId === 'string' ? rawId : '';
}

export const couponController = {
  async getAllCoupons(req: Request, res: Response): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const coupons = await couponService.listCoupons({ status, search });
      res.status(200).json({
        success: true,
        data: coupons,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar kupon.';
      res.status(500).json({ success: false, message });
    }
  },

  async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as CreateCouponPayload;
      const created = await couponService.createNewCoupon(payload);
      res.status(201).json({
        success: true,
        message: `Kode kupon ${created.code} berhasil dibuat.`,
        data: created,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal membuat kupon.';
      res.status(400).json({ success: false, message });
    }
  },

  async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const payload = req.body as UpdateCouponPayload;
      const updated = await couponService.updateExistingCoupon(id, payload);
      res.status(200).json({
        success: true,
        message: 'Data kupon berhasil diperbarui.',
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui kupon.';
      res.status(400).json({ success: false, message });
    }
  },

  async toggleCouponStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const updated = await couponService.toggleCouponActive(id);
      res.status(200).json({
        success: true,
        message: `Kupon ${updated.code} ${updated.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`,
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal mengubah status kupon.';
      res.status(400).json({ success: false, message });
    }
  },

  async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      await couponService.removeCoupon(id);
      res.status(200).json({
        success: true,
        message: 'Kupon berhasil dihapus.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menghapus kupon.';
      res.status(400).json({ success: false, message });
    }
  },
};