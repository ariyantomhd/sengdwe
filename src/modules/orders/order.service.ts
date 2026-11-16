// src/modules/orders/order.service.ts
import { orderRepo, AdminOrderListFilters, PaginatedOrdersResult } from './order.repo';
import { Order, OrderDetailData } from '../../types/order';
import { OrderStatus, LicenseStatus } from '../../types/enums';

const ALLOWED_ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
];

export const orderService = {
  async listAdminOrders(filters: AdminOrderListFilters): Promise<PaginatedOrdersResult> {
    return await orderRepo.getAdminOrders(filters);
  },

  async getAdminOrderDetail(orderId: string): Promise<OrderDetailData> {
    if (!orderId) {
      throw new Error('Order ID wajib disertakan.');
    }

    const detail = await orderRepo.getAdminOrderById(orderId);
    if (!detail) {
      throw new Error('Data order tidak ditemukan.');
    }

    return detail;
  },

  async changeOrderStatus(orderId: string, nextStatus: OrderStatus): Promise<Order> {
    const normalizedStatus = String(nextStatus || '').toUpperCase() as OrderStatus;

    if (!ALLOWED_ORDER_STATUSES.includes(normalizedStatus)) {
      throw new Error(`Status pembayaran '${nextStatus}' tidak valid.`);
    }

    const updatedOrder = await orderRepo.updateOrderPaymentStatus(orderId, normalizedStatus);

    // Otomatis sinkronkan status lisensi jika order direfund / gagal / diaktifkan kembali
    if (normalizedStatus === 'REFUNDED' || normalizedStatus === 'FAILED') {
      await orderRepo.syncLicensesStatusByOrder(orderId, 'REVOKED' as LicenseStatus);
    } else if (normalizedStatus === 'PAID') {
      await orderRepo.syncLicensesStatusByOrder(orderId, 'ACTIVE' as LicenseStatus);
    }

    return updatedOrder;
  },
};