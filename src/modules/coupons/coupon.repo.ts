// src/modules/coupons/coupon.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponRecord {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_purchase: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponPayload {
  code: string;
  description?: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_purchase?: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  is_active?: boolean;
  expires_at?: string | null;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload>;

export interface AdminCouponFilters {
  status?: string;
  search?: string;
}

function normalizeCouponRow(row: CouponRecord): CouponRecord {
  return {
    ...row,
    discount_value: Number(row.discount_value || 0),
    min_purchase: Number(row.min_purchase || 0),
    max_discount: row.max_discount !== null && row.max_discount !== undefined
      ? Number(row.max_discount)
      : null,
    usage_limit: row.usage_limit !== null && row.usage_limit !== undefined
      ? Number(row.usage_limit)
      : null,
    used_count: Number(row.used_count || 0),
  };
}

export const couponRepo = {
  async listAdminCoupons(filters: AdminCouponFilters): Promise<CouponRecord[]> {
    let query = supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    const status = (filters.status || 'ALL').toUpperCase();
    const nowIso = new Date().toISOString();

    if (status === 'ACTIVE') {
      query = query.eq('is_active', true);
    } else if (status === 'INACTIVE') {
      query = query.eq('is_active', false);
    } else if (status === 'EXPIRED') {
      query = query.not('expires_at', 'is', null).lte('expires_at', nowIso);
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = filters.search.trim();
      query = query.or(`code.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Gagal memuat daftar kupon: ${error.message}`);
    }

    let items = ((data || []) as CouponRecord[]).map(normalizeCouponRow);

    // Filter tambahan untuk status ACTIVE agar tidak menyertakan kupon yang sudah melewati expires_at
    if (status === 'ACTIVE') {
      const nowMs = Date.now();
      items = items.filter(
        (c) => !c.expires_at || new Date(c.expires_at).getTime() > nowMs
      );
    }

    return items;
  },

  async getCouponById(couponId: string): Promise<CouponRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', couponId)
      .single();

    if (error || !data) return null;
    return normalizeCouponRow(data as CouponRecord);
  },

  async findCouponByCode(code: string): Promise<CouponRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .ilike('code', code.trim())
      .maybeSingle();

    if (error || !data) return null;
    return normalizeCouponRow(data as CouponRecord);
  },

  async createCoupon(payload: CreateCouponPayload): Promise<CouponRecord> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: payload.code,
        description: payload.description ?? null,
        discount_type: payload.discount_type,
        discount_value: payload.discount_value,
        min_purchase: payload.min_purchase ?? 0,
        max_discount: payload.max_discount ?? null,
        usage_limit: payload.usage_limit ?? null,
        used_count: 0,
        is_active: payload.is_active ?? true,
        expires_at: payload.expires_at ?? null,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal membuat kupon baru: ${error?.message || 'Unknown error'}`);
    }

    return normalizeCouponRow(data as CouponRecord);
  },

  async updateCoupon(couponId: string, payload: UpdateCouponPayload): Promise<CouponRecord> {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', couponId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal memperbarui kupon: ${error?.message || 'Kupon tidak ditemukan'}`);
    }

    return normalizeCouponRow(data as CouponRecord);
  },

  async deleteCoupon(couponId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('coupons').delete().eq('id', couponId);
    if (error) {
      throw new Error(`Gagal menghapus kupon: ${error.message}`);
    }
  },
};