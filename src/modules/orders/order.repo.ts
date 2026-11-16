// src/modules/orders/order.repo.ts
import { supabaseAdmin } from '../../config/supabase';
import { Order, OrderBuyer, OrderDetailData, License } from '../../types/order';
import { OrderStatus, LicenseStatus } from '../../types/enums';

export interface AdminOrderListFilters {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

export interface PaginatedOrdersResult {
  items: Order[];
  pagination: {
    page: number;
    limit: number;
    total_rows: number;
    total_pages: number;
  };
}

type BuyerDictionary = Record<string, OrderBuyer>;
type ProductSummary = {
  id: string;
  title: string;
  slug: string;
  images_url?: string | null;
};
type ProductDictionary = Record<string, ProductSummary>;

async function fetchBuyersByIds(buyerIds: string[]): Promise<BuyerDictionary> {
  const uniqueIds = Array.from(new Set(buyerIds.filter(Boolean)));
  const dict: BuyerDictionary = {};

  if (uniqueIds.length === 0) {
    return dict;
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('id, username, email, avatar_url')
    .in('id', uniqueIds);

  if (Array.isArray(data)) {
    for (const row of data as OrderBuyer[]) {
      dict[row.id] = row;
    }
  }

  return dict;
}

export const orderRepo = {
  async getAdminOrders(filters: AdminOrderListFilters): Promise<PaginatedOrdersResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('payment_status', filters.status.toUpperCase());
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = filters.search.trim();
      query = query.or(
        `invoice_number.ilike.%${term}%,paypal_transaction_id.ilike.%${term}%,affiliate_token_used.ilike.%${term}%,affiliate_code.ilike.%${term}%,coupon_code.ilike.%${term}%`
      );
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(`Gagal memuat daftar order admin: ${error.message}`);
    }

    const rawOrders = (data || []) as unknown as Order[];
    const buyersDict = await fetchBuyersByIds(rawOrders.map((o) => o.buyer_id));

    const enrichedOrders: Order[] = rawOrders.map((order) => {
      const buyer = buyersDict[order.buyer_id] || null;
      return {
        ...order,
        buyer,
        buyer_name: buyer?.username || order.buyer_name,
        buyer_email: buyer?.email || order.buyer_email,
      };
    });

    const totalRows = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / limit));

    return {
      items: enrichedOrders,
      pagination: {
        page,
        limit,
        total_rows: totalRows,
        total_pages: totalPages,
      },
    };
  },

  async getAdminOrderById(orderId: string): Promise<OrderDetailData | null> {
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return null;
    }

    const rawOrder = orderData as unknown as OrderDetailData;

    const buyersDict = await fetchBuyersByIds([rawOrder.buyer_id]);
    const buyer = buyersDict[rawOrder.buyer_id] || null;

    const { data: itemsData } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    const rawItems = (itemsData || []) as NonNullable<OrderDetailData['order_items']>;

    const productIds = Array.from(new Set(rawItems.map((i) => i.product_id).filter(Boolean)));
    const productsDict: ProductDictionary = {};

    if (productIds.length > 0) {
      const { data: productsData } = await supabaseAdmin
        .from('products')
        .select('id, title, slug, images_url')
        .in('id', productIds);

      if (Array.isArray(productsData)) {
        for (const p of productsData as ProductSummary[]) {
          productsDict[p.id] = p;
        }
      }
    }

    const enrichedItems = rawItems.map((item) => {
      const prod = productsDict[item.product_id];
      return {
        ...item,
        product: prod,
        product_title: prod?.title || item.product_title,
      };
    });

    const orderItemIds = enrichedItems.map((item) => item.id);
    let issuedLicenses: License[] = [];

    if (orderItemIds.length > 0) {
      const { data: licensesData } = await supabaseAdmin
        .from('licenses')
        .select('*')
        .in('order_item_id', orderItemIds)
        .order('created_at', { ascending: true });

      issuedLicenses = (licensesData || []) as unknown as License[];
    }

    return {
      ...rawOrder,
      buyer,
      buyer_name: buyer?.username || rawOrder.buyer_name,
      buyer_email: buyer?.email || rawOrder.buyer_email,
      order_items: enrichedItems,
      licenses: issuedLicenses,
    };
  },

  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: OrderStatus
  ): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(
        `Gagal memperbarui status pembayaran order: ${error?.message || 'Not found'}`
      );
    }

    const updated = data as unknown as Order;
    const buyersDict = await fetchBuyersByIds([updated.buyer_id]);
    const buyer = buyersDict[updated.buyer_id] || null;

    return {
      ...updated,
      buyer,
      buyer_name: buyer?.username || updated.buyer_name,
      buyer_email: buyer?.email || updated.buyer_email,
    };
  },

  async syncLicensesStatusByOrder(
    orderId: string,
    licenseStatus: LicenseStatus
  ): Promise<void> {
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('order_id', orderId);

    const itemIds = (items || []).map((row: { id: string }) => row.id);
    if (itemIds.length === 0) return;

    await supabaseAdmin
      .from('licenses')
      .update({
        status: licenseStatus,
        updated_at: new Date().toISOString(),
      })
      .in('order_item_id', itemIds);
  },
};