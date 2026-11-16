// src/modules/auth/auth.controller.ts
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/auth';
import { authService } from './auth.services';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Autentikasi gagal.';
      res.status(400).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          details: errorMessage,
        },
      });
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const adminId = req.user?.id || req.userId;
      if (!adminId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            details: 'Sesi admin tidak valid.',
          },
        });
        return;
      }

      const result = await authService.getProfile(adminId);
      res.status(200).json(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat profil.';
      res.status(404).json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          details: errorMessage,
        },
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Logout berhasil.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal melakukan logout.';
      res.status(400).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          details: errorMessage,
        },
      });
    }
  }
}

export const authController = new AuthController();