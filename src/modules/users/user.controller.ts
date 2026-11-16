// src/modules/users/user.controller.ts
import { Request, Response } from 'express';
import { userService } from './user.service';

function resolveParamId(rawId: string | string[] | undefined): string {
  if (Array.isArray(rawId)) return rawId[0] || '';
  return typeof rawId === 'string' ? rawId : '';
}

export const userController = {
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const role = typeof req.query.role === 'string' ? req.query.role : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const vpnOnly = req.query.vpn_only === 'true';

      const users = await userService.listUsers({ role, status, vpnOnly, search });
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memuat daftar pengguna.';
      res.status(500).json({ success: false, message });
    }
  },

  async changeRole(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const { role } = req.body as { role?: string };
      const updated = await userService.updateUserRole(id, role || '');

      res.status(200).json({
        success: true,
        message: `Role pengguna ${updated.username} diperbarui menjadi ${updated.role}.`,
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal mengubah role pengguna.';
      res.status(400).json({ success: false, message });
    }
  },

  async changeStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = resolveParamId(req.params.id);
      const { status } = req.body as { status?: string };
      const updated = await userService.updateUserStatus(id, status || '');

      res.status(200).json({
        success: true,
        message: `Status akun ${updated.username} diperbarui menjadi ${updated.status}.`,
        data: updated,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal mengubah status akun.';
      res.status(400).json({ success: false, message });
    }
  },
};