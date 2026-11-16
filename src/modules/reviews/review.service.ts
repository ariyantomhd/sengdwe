// src/modules/reviews/review.service.ts
import {
  reviewRepo,
  AdminReviewFilters,
  CreateInjectedReviewPayload,
  ProductReviewRecord,
  UpdateReviewPayload,
} from './review.repo';

export const reviewService = {
  async listReviews(filters: AdminReviewFilters): Promise<ProductReviewRecord[]> {
    return await reviewRepo.listAdminReviews(filters);
  },

  async injectReview(input: CreateInjectedReviewPayload): Promise<ProductReviewRecord> {
    if (!input.product_id || !input.product_id.trim()) {
      throw new Error('Produk wajib dipilih.');
    }

    const reviewerName = (input.reviewer_name || '').trim();
    if (reviewerName.length < 2) {
      throw new Error('Nama reviewer wajib diisi minimal 2 karakter.');
    }

    const rating = Math.round(Number(input.rating));
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new Error('Rating wajib bernilai antara 1 hingga 5.');
    }

    const comment = (input.comment || '').trim();
    if (comment.length < 5) {
      throw new Error('Isi ulasan (comment) wajib diisi minimal 5 karakter.');
    }

    const created = await reviewRepo.createInjectedReview({
      product_id: input.product_id.trim(),
      reviewer_name: reviewerName,
      reviewer_role: input.reviewer_role?.trim() || null,
      reviewer_avatar: input.reviewer_avatar?.trim() || null,
      rating,
      title: input.title?.trim() || null,
      comment,
      is_verified_purchase: input.is_verified_purchase ?? true,
      is_approved: input.is_approved ?? true,
      created_at: input.created_at || new Date().toISOString(),
    });

    await reviewRepo.recalculateProductAggregate(created.product_id);
    return created;
  },

  async updateExistingReview(
    reviewId: string,
    input: UpdateReviewPayload
  ): Promise<ProductReviewRecord> {
    const existing = await reviewRepo.getReviewById(reviewId);
    if (!existing) {
      throw new Error('Data review tidak ditemukan.');
    }

    const payload: UpdateReviewPayload = {};

    if (input.reviewer_name !== undefined) {
      const cleanName = input.reviewer_name.trim();
      if (cleanName.length < 2) throw new Error('Nama reviewer minimal 2 karakter.');
      payload.reviewer_name = cleanName;
    }

    if (input.reviewer_role !== undefined) {
      payload.reviewer_role = input.reviewer_role?.trim() || null;
    }

    if (input.rating !== undefined) {
      const r = Math.round(Number(input.rating));
      if (isNaN(r) || r < 1 || r > 5) throw new Error('Rating harus antara 1 sampai 5.');
      payload.rating = r;
    }

    if (input.title !== undefined) {
      payload.title = input.title?.trim() || null;
    }

    if (input.comment !== undefined) {
      const c = input.comment.trim();
      if (c.length < 5) throw new Error('Komentar ulasan minimal 5 karakter.');
      payload.comment = c;
    }

    if (input.is_verified_purchase !== undefined) {
      payload.is_verified_purchase = Boolean(input.is_verified_purchase);
    }

    if (input.is_approved !== undefined) {
      payload.is_approved = Boolean(input.is_approved);
    }

    if (input.created_at !== undefined && input.created_at) {
      payload.created_at = input.created_at;
    }

    const updated = await reviewRepo.updateReview(reviewId, payload);
    await reviewRepo.recalculateProductAggregate(updated.product_id);
    return updated;
  },

  async toggleReviewVisibility(reviewId: string): Promise<ProductReviewRecord> {
    const existing = await reviewRepo.getReviewById(reviewId);
    if (!existing) {
      throw new Error('Data review tidak ditemukan.');
    }

    const updated = await reviewRepo.updateReview(reviewId, {
      is_approved: !existing.is_approved,
    });
    await reviewRepo.recalculateProductAggregate(updated.product_id);
    return updated;
  },

  async removeReview(reviewId: string): Promise<void> {
    const existing = await reviewRepo.getReviewById(reviewId);
    if (!existing) {
      throw new Error('Data review tidak ditemukan.');
    }

    const productId = existing.product_id;
    await reviewRepo.deleteReview(reviewId);
    await reviewRepo.recalculateProductAggregate(productId);
  },
};