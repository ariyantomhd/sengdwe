// src/modules/coupons/coupon.service.ts
import {
  couponRepo,
  AdminCouponFilters,
  CouponRecord,
  CreateCouponPayload,
  UpdateCouponPayload,
} from './coupon.repo';

export const couponService = {
  async listCoupons(filters: AdminCouponFilters): Promise<CouponRecord[]> {
    return await couponRepo.listAdminCoupons(filters);
  },

  async createNewCoupon(input: CreateCouponPayload): Promise<CouponRecord> {
    const cleanCode = (input.code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length < 3) {
      throw new Error('Kode kupon wajib diisi minimal 3 karakter tanpa spasi.');
    }

    const existing = await couponRepo.findCouponByCode(cleanCode);
    if (existing) {
      throw new Error(`Kode kupon "${cleanCode}" sudah terdaftar di sistem.`);
    }

    const discountType = (input.discount_type || 'PERCENTAGE').toUpperCase();
    if (discountType !== 'PERCENTAGE' && discountType !== 'FIXED') {
      throw new Error('Tipe diskon harus PERCENTAGE atau FIXED.');
    }

    const discountValue = Number(input.discount_value);
    if (isNaN(discountValue) || discountValue <= 0) {
      throw new Error('Nilai diskon harus lebih besar dari 0.');
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      throw new Error('Diskon persentase tidak boleh melebihi 100%.');
    }

    const minPurchase = Math.max(0, Number(input.min_purchase || 0));
    const maxDiscount =
      input.max_discount !== null && input.max_discount !== undefined && Number(input.max_discount) > 0
        ? Number(input.max_discount)
        : null;
    const usageLimit =
      input.usage_limit !== null && input.usage_limit !== undefined && Number(input.usage_limit) > 0
        ? Math.floor(Number(input.usage_limit))
        : null;

    return await couponRepo.createCoupon({
      code: cleanCode,
      description: input.description?.trim() || null,
      discount_type: discountType,
      discount_value: discountValue,
      min_purchase: minPurchase,
      max_discount: discountType === 'PERCENTAGE' ? maxDiscount : null,
      usage_limit: usageLimit,
      is_active: input.is_active ?? true,
      expires_at: input.expires_at || null,
    });
  },

  async updateExistingCoupon(couponId: string, input: UpdateCouponPayload): Promise<CouponRecord> {
    const existing = await couponRepo.getCouponById(couponId);
    if (!existing) {
      throw new Error('Kupon tidak ditemukan.');
    }

    const updatePayload: UpdateCouponPayload = {};

    if (input.code !== undefined) {
      const cleanCode = input.code.trim().toUpperCase().replace(/\s+/g, '');
      if (!cleanCode || cleanCode.length < 3) {
        throw new Error('Kode kupon minimal 3 karakter.');
      }
      if (cleanCode !== existing.code) {
        const duplicate = await couponRepo.findCouponByCode(cleanCode);
        if (duplicate) {
          throw new Error(`Kode kupon "${cleanCode}" sudah digunakan.`);
        }
      }
      updatePayload.code = cleanCode;
    }

    if (input.description !== undefined) {
      updatePayload.description = input.description?.trim() || null;
    }

    const nextType = (input.discount_type || existing.discount_type).toUpperCase();
    if (nextType !== 'PERCENTAGE' && nextType !== 'FIXED') {
      throw new Error('Tipe diskon tidak valid.');
    }
    updatePayload.discount_type = nextType;

    if (input.discount_value !== undefined) {
      const val = Number(input.discount_value);
      if (isNaN(val) || val <= 0) {
        throw new Error('Nilai diskon harus lebih dari 0.');
      }
      if (nextType === 'PERCENTAGE' && val > 100) {
        throw new Error('Diskon persentase maksimal 100%.');
      }
      updatePayload.discount_value = val;
    }

    if (input.min_purchase !== undefined) {
      updatePayload.min_purchase = Math.max(0, Number(input.min_purchase || 0));
    }

    if (input.max_discount !== undefined) {
      updatePayload.max_discount =
        nextType === 'PERCENTAGE' && input.max_discount !== null && Number(input.max_discount) > 0
          ? Number(input.max_discount)
          : null;
    }

    if (input.usage_limit !== undefined) {
      updatePayload.usage_limit =
        input.usage_limit !== null && Number(input.usage_limit) > 0
          ? Math.floor(Number(input.usage_limit))
          : null;
    }

    if (input.expires_at !== undefined) {
      updatePayload.expires_at = input.expires_at || null;
    }

    if (input.is_active !== undefined) {
      updatePayload.is_active = Boolean(input.is_active);
    }

    return await couponRepo.updateCoupon(couponId, updatePayload);
  },

  async toggleCouponActive(couponId: string): Promise<CouponRecord> {
    const existing = await couponRepo.getCouponById(couponId);
    if (!existing) {
      throw new Error('Kupon tidak ditemukan.');
    }
    return await couponRepo.updateCoupon(couponId, {
      is_active: !existing.is_active,
    });
  },

  async removeCoupon(couponId: string): Promise<void> {
    const existing = await couponRepo.getCouponById(couponId);
    if (!existing) {
      throw new Error('Kupon tidak ditemukan.');
    }
    await couponRepo.deleteCoupon(couponId);
  },
};