// src/modules/dashboard/dashboard.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export interface DashboardRawOrderRow {
  id: string;
  invoice_number: string;
  buyer_id: string;
  payment_gateway: string;
  payment_status: string;
  grand_total: number | string;
  created_at: string;
}

export interface DashboardBuyerProfile {
  id: string;
  username?: string;
  email: string;
}

export interface DashboardRawCounts {
  totalProducts: number;
  publishedProducts: number;
  activeDeals: number;
  activeCoupons: number;
  totalAffiliates: number;
}

export const dashboardRepo = {
  async fetchModuleCounts(): Promise<DashboardRawCounts> {
    const nowIso = new Date().toISOString();

    const [
      productsRes,
      publishedRes,
      dealsRes,
      couponsRes,
      affiliatesRes,
    ] = await Promise.all([
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PUBLISHED'),
      supabaseAdmin
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('expires_at', nowIso),
      supabaseAdmin
        .from('coupons')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabaseAdmin.from('affiliates').select('id', { count: 'exact', head: true }),
    ]);

    if (productsRes.error) {
      throw new Error(`Gagal memuat total produk: ${productsRes.error.message}`);
    }
    if (publishedRes.error) {
      throw new Error(`Gagal memuat produk terbit: ${publishedRes.error.message}`);
    }
    if (dealsRes.error) {
      throw new Error(`Gagal memuat promo aktif: ${dealsRes.error.message}`);
    }
    if (couponsRes.error) {
      throw new Error(`Gagal memuat kupon aktif: ${couponsRes.error.message}`);
    }
    if (affiliatesRes.error) {
      throw new Error(`Gagal memuat data afiliasi: ${affiliatesRes.error.message}`);
    }

    return {
      totalProducts: productsRes.count ?? 0,
      publishedProducts: publishedRes.count ?? 0,
      activeDeals: dealsRes.count ?? 0,
      activeCoupons: couponsRes.count ?? 0,
      totalAffiliates: affiliatesRes.count ?? 0,
    };
  },

  async fetchAllOrderFinancials(): Promise<
    Array<{ payment_status: string; grand_total: number | string }>
  > {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('payment_status, grand_total');

    if (error) {
      throw new Error(`Gagal memuat data transaksi dashboard: ${error.message}`);
    }

    return (data || []) as Array<{ payment_status: string; grand_total: number | string }>;
  },

  async fetchRecentOrders(limit = 8): Promise<DashboardRawOrderRow[]> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(
        'id, invoice_number, buyer_id, payment_gateway, payment_status, grand_total, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Gagal memuat transaksi terbaru: ${error.message}`);
    }

    return (data || []) as DashboardRawOrderRow[];
  },

  async fetchBuyersDictionary(
    buyerIds: string[]
  ): Promise<Record<string, DashboardBuyerProfile>> {
    const uniqueIds = Array.from(new Set(buyerIds.filter(Boolean)));
    const dict: Record<string, DashboardBuyerProfile> = {};

    if (uniqueIds.length === 0) return dict;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email')
      .in('id', uniqueIds);

    if (error) {
      throw new Error(`Gagal memuat profil pembeli: ${error.message}`);
    }

    if (Array.isArray(data)) {
      for (const row of data as DashboardBuyerProfile[]) {
        dict[row.id] = row;
      }
    }

    return dict;
  },
};