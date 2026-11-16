// src/modules/dashboard/dashboard.controller.ts
import { Request, Response } from 'express';
import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await dashboardService.buildDashboardOverview();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Gagal memuat ringkasan dashboard admin.';
      res.status(500).json({
        success: false,
        message,
      });
    }
  },
};