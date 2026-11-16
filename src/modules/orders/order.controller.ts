// src/modules/orders/order.controller.ts
import { Request, Response } from 'express';
import { orderService } from './order.service';
import { OrderStatus } from '../../types/enums';

function resolveParamId(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) return rawId[0] || '';
  return typeof rawId === 'string' ? rawId : '';
}

export const orderController = {
  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const result = await orderService.listAdminOrders({
        page,
        limit,
        status,
        search,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar orders.';
      res.status(500).json({
        success: false,
        message,
      });
    }
  },

  async getOrderDetail(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const detail = await orderService.getAdminOrderDetail(id);

      res.status(200).json({
        success: true,
        data: detail,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat detail order.';
      const statusCode = message.includes('tidak ditemukan') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  },

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const { payment_status } = req.body as { payment_status?: OrderStatus };

      if (!payment_status) {
        res.status(400).json({
          success: false,
          message: 'Field payment_status wajib diisi.',
        });
        return;
      }

      const updated = await orderService.changeOrderStatus(id, payment_status);

      res.status(200).json({
        success: true,
        message: `Status order berhasil diperbarui menjadi ${updated.payment_status}.`,
        data: updated,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memperbarui status order.';
      const statusCode = message.includes('tidak valid') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message,
      });
    }
  },
};