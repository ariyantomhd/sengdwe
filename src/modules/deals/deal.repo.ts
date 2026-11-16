// src/modules/deals/deal.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface DealRecord {
  id: string;
  product_id: string;
  deal_title: string | null;
  deal_badge: string;
  deal_price: number;
  discount_percent: number;
  is_flash_sale: boolean;
  quota_limit: number | null;
  quota_claimed: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    slug: string;
    regular_price: number;
    category_id: string | null;
    images_url: string | null;
  } | null;
}

export interface CreateDealPayload {
  product_id: string;
  deal_title?: string | null;
  deal_badge?: string;
  deal_price: number;
  discount_percent?: number;
  is_flash_sale?: boolean;
  quota_limit?: number | null;
  starts_at?: string;
  expires_at: string;
  is_active?: boolean;
}

export type UpdateDealPayload = Partial<CreateDealPayload>;

export interface AdminDealFilters {
  status?: string;
  search?: string;
}

type ProductInfo = NonNullable<DealRecord['product']>;

async function fetchProductsDict(productIds: string[]): Promise<Record<string, ProductInfo>> {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  const dict: Record<string, ProductInfo> = {};

  if (uniqueIds.length === 0) return dict;

  const { data } = await supabaseAdmin
    .from('products')
    .select('id, title, slug, regular_price, category_id, images_url')
    .in('id', uniqueIds);

  if (Array.isArray(data)) {
    for (const row of data as ProductInfo[]) {
      dict[row.id] = row;
    }
  }

  return dict;
}

async function syncProductDealFields(
  productId: string,
  deal: Pick<DealRecord, 'deal_price' | 'expires_at' | 'is_flash_sale' | 'is_active'> | null
): Promise<void> {
  if (!deal || !deal.is_active) {
    await supabaseAdmin
      .from('products')
      .update({
        discount_price: null,
        discount_ends_at: null,
        is_flash_sale: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);
    return;
  }

  await supabaseAdmin
    .from('products')
    .update({
      discount_price: deal.deal_price,
      discount_ends_at: deal.expires_at,
      is_flash_sale: Boolean(deal.is_flash_sale),
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);
}

export const dealRepo = {
  async listAdminDeals(filters: AdminDealFilters): Promise<DealRecord[]> {
    let query = supabaseAdmin
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });

    const status = (filters.status || 'ALL').toUpperCase();
    const nowIso = new Date().toISOString();

    if (status === 'ACTIVE') {
      query = query.eq('is_active', true).gt('expires_at', nowIso);
    } else if (status === 'FLASH_SALE') {
      query = query.eq('is_flash_sale', true).eq('is_active', true);
    } else if (status === 'EXPIRED') {
      query = query.lte('expires_at', nowIso);
    } else if (status === 'INACTIVE') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Gagal memuat data deals: ${error.message}`);
    }

    const rawDeals = (data || []) as DealRecord[];
    const productsDict = await fetchProductsDict(rawDeals.map((d) => d.product_id));

    let enriched = rawDeals.map((deal) => ({
      ...deal,
      deal_price: Number(deal.deal_price),
      discount_percent: Number(deal.discount_percent || 0),
      quota_claimed: Number(deal.quota_claimed || 0),
      product: productsDict[deal.product_id] || null,
    }));

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      enriched = enriched.filter(
        (d) =>
          (d.deal_title || '').toLowerCase().includes(q) ||
          (d.deal_badge || '').toLowerCase().includes(q) ||
          (d.product?.title || '').toLowerCase().includes(q)
      );
    }

    return enriched;
  },

  async getProductById(productId: string): Promise<ProductInfo | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, title, slug, regular_price, category_id, images_url')
      .eq('id', productId)
      .single();

    if (error || !data) return null;
    return data as ProductInfo;
  },

  async getDealById(dealId: string): Promise<DealRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (error || !data) return null;

    const deal = data as DealRecord;
    const productsDict = await fetchProductsDict([deal.product_id]);

    return {
      ...deal,
      deal_price: Number(deal.deal_price),
      discount_percent: Number(deal.discount_percent || 0),
      product: productsDict[deal.product_id] || null,
    };
  },

  async createDeal(payload: CreateDealPayload): Promise<DealRecord> {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('deals')
      .insert({
        product_id: payload.product_id,
        deal_title: payload.deal_title ?? null,
        deal_badge: payload.deal_badge || 'FLASH SALE',
        deal_price: payload.deal_price,
        discount_percent: payload.discount_percent ?? 0,
        is_flash_sale: payload.is_flash_sale ?? true,
        quota_limit: payload.quota_limit ?? null,
        quota_claimed: 0,
        starts_at: payload.starts_at || nowIso,
        expires_at: payload.expires_at,
        is_active: payload.is_active ?? true,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal membuat deal baru: ${error?.message || 'Unknown error'}`);
    }

    const created = data as DealRecord;
    await syncProductDealFields(created.product_id, created);

    const productsDict = await fetchProductsDict([created.product_id]);
    return {
      ...created,
      deal_price: Number(created.deal_price),
      product: productsDict[created.product_id] || null,
    };
  },

  async updateDeal(dealId: string, payload: UpdateDealPayload): Promise<DealRecord> {
    const updateBody: Record<string, unknown> = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('deals')
      .update(updateBody)
      .eq('id', dealId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal memperbarui deal: ${error?.message || 'Deal tidak ditemukan'}`);
    }

    const updated = data as DealRecord;
    await syncProductDealFields(updated.product_id, updated);

    const productsDict = await fetchProductsDict([updated.product_id]);
    return {
      ...updated,
      deal_price: Number(updated.deal_price),
      product: productsDict[updated.product_id] || null,
    };
  },

  async deleteDeal(dealId: string): Promise<void> {
    const existing = await this.getDealById(dealId);
    if (!existing) {
      throw new Error('Deal tidak ditemukan.');
    }

    const { error } = await supabaseAdmin.from('deals').delete().eq('id', dealId);
    if (error) {
      throw new Error(`Gagal menghapus deal: ${error.message}`);
    }

    await syncProductDealFields(existing.product_id, null);
  },
};