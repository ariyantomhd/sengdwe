// src/modules/deals/deal.service.ts
import {
  dealRepo,
  AdminDealFilters,
  CreateDealPayload,
  UpdateDealPayload,
  DealRecord,
} from './deal.repo';

export const dealService = {
  async listDeals(filters: AdminDealFilters): Promise<DealRecord[]> {
    return await dealRepo.listAdminDeals(filters);
  },

  async createNewDeal(input: CreateDealPayload): Promise<DealRecord> {
    if (!input.product_id) {
      throw new Error('Produk wajib dipilih.');
    }
    if (!input.expires_at) {
      throw new Error('Tanggal berakhir promo (expires_at) wajib diisi.');
    }

    const product = await dealRepo.getProductById(input.product_id);
    if (!product) {
      throw new Error('Produk yang dipilih tidak ditemukan di katalog.');
    }

    const regularPrice = Number(product.regular_price || 0);
    const dealPrice = Number(input.deal_price);

    if (isNaN(dealPrice) || dealPrice < 0) {
      throw new Error('Harga promo (deal_price) tidak valid.');
    }
    if (regularPrice > 0 && dealPrice >= regularPrice) {
      throw new Error(
        `Harga promo ($${dealPrice}) harus lebih rendah dari harga normal ($${regularPrice}).`
      );
    }

    const calculatedDiscount =
      regularPrice > 0
        ? Math.max(1, Math.round(((regularPrice - dealPrice) / regularPrice) * 100))
        : Number(input.discount_percent || 0);

    return await dealRepo.createDeal({
      ...input,
      deal_title: input.deal_title?.trim() || product.title,
      deal_badge: (input.deal_badge || 'FLASH SALE').trim().toUpperCase(),
      deal_price: dealPrice,
      discount_percent: calculatedDiscount,
    });
  },

  async updateExistingDeal(dealId: string, input: UpdateDealPayload): Promise<DealRecord> {
    const existing = await dealRepo.getDealById(dealId);
    if (!existing) {
      throw new Error('Deal tidak ditemukan.');
    }

    const targetProductId = input.product_id || existing.product_id;
    const product = await dealRepo.getProductById(targetProductId);
    const regularPrice = Number(product?.regular_price || existing.product?.regular_price || 0);

    const nextDealPrice =
      input.deal_price !== undefined ? Number(input.deal_price) : Number(existing.deal_price);

    if (regularPrice > 0 && nextDealPrice >= regularPrice) {
      throw new Error(
        `Harga promo ($${nextDealPrice}) harus lebih rendah dari harga normal ($${regularPrice}).`
      );
    }

    const nextDiscountPercent =
      regularPrice > 0
        ? Math.max(1, Math.round(((regularPrice - nextDealPrice) / regularPrice) * 100))
        : input.discount_percent ?? existing.discount_percent;

    return await dealRepo.updateDeal(dealId, {
      ...input,
      deal_badge: input.deal_badge ? input.deal_badge.trim().toUpperCase() : undefined,
      deal_price: nextDealPrice,
      discount_percent: nextDiscountPercent,
    });
  },

  async toggleDealActive(dealId: string): Promise<DealRecord> {
    const existing = await dealRepo.getDealById(dealId);
    if (!existing) {
      throw new Error('Deal tidak ditemukan.');
    }
    return await dealRepo.updateDeal(dealId, {
      is_active: !existing.is_active,
    });
  },

  async removeDeal(dealId: string): Promise<void> {
    await dealRepo.deleteDeal(dealId);
  },
};