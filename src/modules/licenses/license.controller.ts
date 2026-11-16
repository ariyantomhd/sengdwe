// src/modules/licenses/license.controller.ts
import { Request, Response } from 'express';
import { licenseService } from './license.service';

function resolveParamId(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) return rawId[0] || '';
  return typeof rawId === 'string' ? rawId : '';
}

export const licenseController = {
  async getAllLicenses(req: Request, res: Response): Promise<void> {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const license_type =
        typeof req.query.license_type === 'string' ? req.query.license_type : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const items = await licenseService.listLicenses({ status, license_type, search });
      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar lisensi.';
      res.status(500).json({ success: false, message });
    }
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const { status } = req.body as { status?: string };
      const updated = await licenseService.changeStatus(id, status || '');

      res.status(200).json({
        success: true,
        message: `Status lisensi ${updated.license_key} diperbarui menjadi ${updated.status}.`,
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memperbarui status lisensi.';
      res.status(400).json({ success: false, message });
    }
  },

  async resetDomains(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const { domain } = (req.body || {}) as { domain?: string };

      const updated = domain
        ? await licenseService.removeSingleDomain(id, domain)
        : await licenseService.resetAllDomains(id);

      res.status(200).json({
        success: true,
        message: domain
          ? `Domain ${domain} berhasil dilepas dari lisensi.`
          : `Seluruh aktivasi domain untuk ${updated.license_key} berhasil di-reset.`,
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal mereset aktivasi domain.';
      res.status(400).json({ success: false, message });
    }
  },
};