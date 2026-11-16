// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

// Perluas interface Request Express agar dapat mengenali properti user/admin yang sedang login
export interface AuthenticatedRequest extends Request {
  adminUser?: {
    id: string;
    email: string;
    role?: string;
    [key: string]: any;
  };
}

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

    const token = authHeader.split(' ')[1];

    // Verifikasi token menggunakan Supabase Auth Admin API
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

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

    // Optional: Validasi tambahan role admin dari metadata atau tabel profil database jika diperlukan
    // Contoh pengecekan role:
    // const userRole = user.user_metadata?.role || user.app_metadata?.role;
    // if (userRole !== 'admin') { ... }

    // Lampirkan data user ke objek request agar bisa diakses oleh controller berikutnya
    req.adminUser = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'admin',
    };

    next();
  } catch (err: any) {
    console.error('Auth Middleware Error:', err.message);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        details: err.message,
      },
    });
  }
}