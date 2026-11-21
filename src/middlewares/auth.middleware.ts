// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    role?: string;
    [key: string]: unknown;
  };
}

// Stateless token verification (no in-memory Map cache across serverless invocations)
export async function verifyAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          details: 'Akses ditolak: Token autentikasi Bearer tidak ditemukan atau format salah.',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          details: 'Token autentikasi kosong.',
        },
      });
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          details: authError?.message || 'Sesi admin telah berakhir atau token tidak valid.',
        },
      });
      return;
    }

    req.adminUser = {
      id: user.id,
      email: user.email || '',
      role: String(user.user_metadata?.role || 'admin'),
    };

    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth middleware error';
    console.error('Auth Middleware Error:', message);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        details: message,
      },
    });
  }
}