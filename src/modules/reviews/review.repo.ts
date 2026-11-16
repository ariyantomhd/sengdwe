// src/modules/reviews/review.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface ProductReviewRecord {
  id: string;
  product_id: string;
  buyer_id: string | null;
  order_item_id: string | null;
  reviewer_name: string;
  reviewer_role: string | null;
  reviewer_avatar: string | null;
  rating: number;
  title: string | null;
  comment: string;
  is_admin_injected: boolean;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface CreateInjectedReviewPayload {
  product_id: string;
  reviewer_name: string;
  reviewer_role?: string | null;
  reviewer_avatar?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  is_verified_purchase?: boolean;
  is_approved?: boolean;
  created_at?: string;
}

export interface UpdateReviewPayload {
  reviewer_name?: string;
  reviewer_role?: string | null;
  rating?: number;
  title?: string | null;
  comment?: string;
  is_verified_purchase?: boolean;
  is_approved?: boolean;
  created_at?: string;
}

export interface AdminReviewFilters {
  product_id?: string;
  source?: string; // 'ALL' | 'INJECTED' | 'ORGANIC'
  status?: string; // 'ALL' | 'APPROVED' | 'HIDDEN'
  search?: string;
}

type ProductMini = { id: string; title: string; slug: string };

async function attachProductsMap(rows: ProductReviewRecord[]): Promise<ProductReviewRecord[]> {
  const productIds = Array.from(new Set(rows.map((r) => r.product_id).filter(Boolean)));
  const productMap: Record<string, ProductMini> = {};

  if (productIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, title, slug')
      .in('id', productIds);

    if (Array.isArray(data)) {
      for (const p of data as ProductMini[]) {
        productMap[p.id] = p;
      }
    }
  }

  return rows.map((row) => ({
    ...row,
    rating: Number(row.rating || 5),
    is_admin_injected: Boolean(row.is_admin_injected),
    is_verified_purchase: Boolean(row.is_verified_purchase),
    is_approved: Boolean(row.is_approved),
    product: productMap[row.product_id] || null,
  }));
}

export const reviewRepo = {
  async listAdminReviews(filters: AdminReviewFilters): Promise<ProductReviewRecord[]> {
    let query = supabaseAdmin
      .from('product_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.product_id && filters.product_id !== 'ALL') {
      query = query.eq('product_id', filters.product_id);
    }

    const source = (filters.source || 'ALL').toUpperCase();
    if (source === 'INJECTED') {
      query = query.eq('is_admin_injected', true);
    } else if (source === 'ORGANIC') {
      query = query.eq('is_admin_injected', false);
    }

    const status = (filters.status || 'ALL').toUpperCase();
    if (status === 'APPROVED') {
      query = query.eq('is_approved', true);
    } else if (status === 'HIDDEN') {
      query = query.eq('is_approved', false);
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = filters.search.trim();
      query = query.or(
        `reviewer_name.ilike.%${term}%,reviewer_role.ilike.%${term}%,title.ilike.%${term}%,comment.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Gagal memuat daftar review: ${error.message}`);
    }

    return await attachProductsMap((data || []) as ProductReviewRecord[]);
  },

  async getReviewById(reviewId: string): Promise<ProductReviewRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (error || !data) return null;

    const [enriched] = await attachProductsMap([data as ProductReviewRecord]);
    return enriched || null;
  },

  async createInjectedReview(payload: CreateInjectedReviewPayload): Promise<ProductReviewRecord> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .insert({
        product_id: payload.product_id,
        buyer_id: null,
        order_item_id: null,
        reviewer_name: payload.reviewer_name,
        reviewer_role: payload.reviewer_role ?? null,
        reviewer_avatar: payload.reviewer_avatar ?? null,
        rating: payload.rating,
        title: payload.title ?? null,
        comment: payload.comment,
        is_admin_injected: true,
        is_verified_purchase: payload.is_verified_purchase ?? true,
        is_approved: payload.is_approved ?? true,
        created_at: payload.created_at || nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal menyuntikkan review baru: ${error?.message || 'Unknown error'}`);
    }

    const [enriched] = await attachProductsMap([data as ProductReviewRecord]);
    return enriched;
  },

  async updateReview(
    reviewId: string,
    payload: UpdateReviewPayload
  ): Promise<ProductReviewRecord> {
    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal memperbarui review: ${error?.message || 'Review tidak ditemukan'}`);
    }

    const [enriched] = await attachProductsMap([data as ProductReviewRecord]);
    return enriched;
  },

  async deleteReview(reviewId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('product_reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      throw new Error(`Gagal menghapus review: ${error.message}`);
    }
  },

  async recalculateProductAggregate(productId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_approved', true);

    if (error) {
      console.warn('[Recalculate Rating Warning]:', error.message);
      return;
    }

    const approvedList = (data || []) as Array<{ rating: number }>;
    const count = approvedList.length;
    const avgRating =
      count > 0
        ? Number(
            (
              approvedList.reduce((sum, item) => sum + Number(item.rating || 0), 0) / count
            ).toFixed(2)
          )
        : 0;

    await supabaseAdmin
      .from('products')
      .update({
        rating: avgRating,
        review_count: count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);
  },
};