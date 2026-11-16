// src/modules/licenses/license.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export type LicenseStatusType = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED';

export interface LicenseRecord {
  id: string;
  license_key: string;
  order_item_id: string;
  product_id: string;
  buyer_id: string;
  license_type: string;
  activated_domains: string[];
  activation_count: number;
  status: LicenseStatusType;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  buyer?: {
    id: string;
    username?: string;
    email: string;
  } | null;
  invoice_number?: string | null;
}

export interface AdminLicenseFilters {
  status?: string;
  license_type?: string;
  search?: string;
}

type ProductMini = { id: string; title: string; slug: string };
type BuyerMini = { id: string; username?: string; email: string };

async function fetchRelatedMaps(rows: LicenseRecord[]): Promise<{
  productsDict: Record<string, ProductMini>;
  buyersDict: Record<string, BuyerMini>;
  invoiceDict: Record<string, string>;
}> {
  const productIds = Array.from(new Set(rows.map((r) => r.product_id).filter(Boolean)));
  const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id).filter(Boolean)));
  const orderItemIds = Array.from(new Set(rows.map((r) => r.order_item_id).filter(Boolean)));

  const productsDict: Record<string, ProductMini> = {};
  const buyersDict: Record<string, BuyerMini> = {};
  const invoiceDict: Record<string, string> = {};

  if (productIds.length > 0) {
    const { data: prodData } = await supabaseAdmin
      .from('products')
      .select('id, title, slug')
      .in('id', productIds);

    if (Array.isArray(prodData)) {
      for (const p of prodData as ProductMini[]) {
        productsDict[p.id] = p;
      }
    }
  }

  if (buyerIds.length > 0) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, username, email')
      .in('id', buyerIds);

    if (Array.isArray(userData)) {
      for (const u of userData as BuyerMini[]) {
        buyersDict[u.id] = u;
      }
    }
  }

  if (orderItemIds.length > 0) {
    const { data: itemData } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id')
      .in('id', orderItemIds);

    const items = (itemData || []) as Array<{ id: string; order_id: string }>;
    const orderIds = Array.from(new Set(items.map((i) => i.order_id).filter(Boolean)));

    if (orderIds.length > 0) {
      const { data: orderData } = await supabaseAdmin
        .from('orders')
        .select('id, invoice_number')
        .in('id', orderIds);

      const orderMap: Record<string, string> = {};
      if (Array.isArray(orderData)) {
        for (const o of orderData as Array<{ id: string; invoice_number: string }>) {
          orderMap[o.id] = o.invoice_number;
        }
      }

      for (const item of items) {
        if (orderMap[item.order_id]) {
          invoiceDict[item.id] = orderMap[item.order_id];
        }
      }
    }
  }

  return { productsDict, buyersDict, invoiceDict };
}

function normalizeLicense(
  row: LicenseRecord,
  maps?: {
    productsDict: Record<string, ProductMini>;
    buyersDict: Record<string, BuyerMini>;
    invoiceDict: Record<string, string>;
  }
): LicenseRecord {
  return {
    ...row,
    activated_domains: Array.isArray(row.activated_domains) ? row.activated_domains : [],
    activation_count: Number(row.activation_count || 0),
    product: maps ? maps.productsDict[row.product_id] || null : row.product ?? null,
    buyer: maps ? maps.buyersDict[row.buyer_id] || null : row.buyer ?? null,
    invoice_number: maps ? maps.invoiceDict[row.order_item_id] || null : row.invoice_number ?? null,
  };
}

export const licenseRepo = {
  async listAdminLicenses(filters: AdminLicenseFilters): Promise<LicenseRecord[]> {
    let query = supabaseAdmin
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    const status = (filters.status || 'ALL').toUpperCase();
    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (filters.license_type && filters.license_type.toUpperCase() !== 'ALL') {
      query = query.ilike('license_type', filters.license_type.trim());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Gagal memuat daftar lisensi: ${error.message}`);
    }

    const rawRows = (data || []) as LicenseRecord[];
    const maps = await fetchRelatedMaps(rawRows);
    let enriched = rawRows.map((r) => normalizeLicense(r, maps));

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      enriched = enriched.filter(
        (lic) =>
          lic.license_key.toLowerCase().includes(q) ||
          (lic.product?.title || '').toLowerCase().includes(q) ||
          (lic.buyer?.email || '').toLowerCase().includes(q) ||
          (lic.buyer?.username || '').toLowerCase().includes(q) ||
          (lic.invoice_number || '').toLowerCase().includes(q) ||
          lic.activated_domains.some((d) => d.toLowerCase().includes(q))
      );
    }

    return enriched;
  },

  async getLicenseById(licenseId: string): Promise<LicenseRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .single();

    if (error || !data) return null;

    const raw = data as LicenseRecord;
    const maps = await fetchRelatedMaps([raw]);
    return normalizeLicense(raw, maps);
  },

  async updateLicenseStatus(
    licenseId: string,
    status: LicenseStatusType
  ): Promise<LicenseRecord> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', licenseId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Gagal mengubah status lisensi: ${error?.message || 'Lisensi tidak ditemukan'}`);
    }

    const updated = data as LicenseRecord;
    const maps = await fetchRelatedMaps([updated]);
    return normalizeLicense(updated, maps);
  },

  async updateActivatedDomains(
    licenseId: string,
    domains: string[]
  ): Promise<LicenseRecord> {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .update({
        activated_domains: domains,
        activation_count: domains.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', licenseId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        `Gagal memperbarui domain lisensi: ${error?.message || 'Lisensi tidak ditemukan'}`
      );
    }

    const updated = data as LicenseRecord;
    const maps = await fetchRelatedMaps([updated]);
    return normalizeLicense(updated, maps);
  },
};