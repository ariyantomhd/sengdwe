// src/modules/dashboard/dashboard.service.ts
import {
  dashboardRepo,
  DashboardBuyerProfile,
} from './dashboard.repo';

export interface DashboardRecentOrder {
  id: string;
  invoice_number: string;
  buyer_id: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer: DashboardBuyerProfile | null;
  payment_gateway: string;
  payment_status: string;
  grand_total: number;
  created_at: string;
}

export interface AdminDashboardSummary {
  total_products: number;
  published_products: number;
  total_revenue: number;
  active_orders: number;
  paid_orders: number;
  pending_orders: number;
  active_deals: number;
  active_coupons: number;
  total_affiliates: number;
  recent_orders: DashboardRecentOrder[];
}

export const dashboardService = {
  async buildDashboardOverview(): Promise<AdminDashboardSummary> {
    const counts = await dashboardRepo.fetchModuleCounts();
    const orderFinancials = await dashboardRepo.fetchAllOrderFinancials();
    const rawRecentOrders = await dashboardRepo.fetchRecentOrders(8);

    let totalRevenue = 0;
    let paidOrders = 0;
    let pendingOrders = 0;

    for (const order of orderFinancials) {
      const status = String(order.payment_status || '').toUpperCase();
      if (status === 'PAID') {
        paidOrders += 1;
        totalRevenue += Number(order.grand_total || 0);
      } else if (status === 'PENDING') {
        pendingOrders += 1;
      }
    }

    const buyersDict = await dashboardRepo.fetchBuyersDictionary(
      rawRecentOrders.map((r) => r.buyer_id)
    );

    const recentOrders: DashboardRecentOrder[] = rawRecentOrders.map((order) => {
      const buyer = buyersDict[order.buyer_id] || null;
      return {
        ...order,
        grand_total: Number(order.grand_total || 0),
        buyer,
        buyer_name: buyer?.username,
        buyer_email: buyer?.email,
      };
    });

    return {
      total_products: counts.totalProducts,
      published_products: counts.publishedProducts,
      total_revenue: Number(totalRevenue.toFixed(2)),
      active_orders: paidOrders + pendingOrders,
      paid_orders: paidOrders,
      pending_orders: pendingOrders,
      active_deals: counts.activeDeals,
      active_coupons: counts.activeCoupons,
      total_affiliates: counts.totalAffiliates,
      recent_orders: recentOrders,
    };
  },
};