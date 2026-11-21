// src/modules/auth/auth.repo.ts
import { supabaseAdmin, createAuthClient } from '../../config/supabase';
import type { User, LoginPayload, AuthTokenResponse } from '../../types/auth';
import { UserRole, AccountStatus } from '../../types/enums';

export class AuthRepository {
  async authenticateAdmin(payload: LoginPayload): Promise<AuthTokenResponse> {
    // PENTING: login memakai client sekali pakai (createAuthClient), BUKAN supabaseAdmin.
    // Kalau signInWithPassword dipanggil lewat supabaseAdmin (client global), sesi user
    // tersimpan di memori dan semua query berikutnya berjalan sebagai user (kena RLS),
    // sehingga dashboard menampilkan data kosong sampai BE direstart.
    const { data: authData, error: authError } = await createAuthClient().auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (authError || !authData.user || !authData.session) {
      throw new Error(authError?.message || 'Email atau password admin salah.');
    }

    // Ambil profil resmi dari tabel public.users berdasarkan UUID
    // (tetap pakai supabaseAdmin / service role untuk query data)
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, username, creator_number, avatar_url, role, status, created_at, updated_at')
      .eq('id', authData.user.id)
      .single();

    if (dbError || !dbUser) {
      throw new Error('Data profil pengguna tidak ditemukan di tabel users.');
    }

    if (dbUser.role !== UserRole.ADMIN) {
      throw new Error('Akses ditolak: Akun ini tidak memiliki hak akses ADMIN.');
    }

    if (dbUser.status !== AccountStatus.ACTIVE) {
      throw new Error('Akun admin tidak aktif atau sedang ditangguhkan.');
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username || authData.user.email?.split('@')[0] || 'admin',
      creator_number: dbUser.creator_number ?? undefined,
      avatar_url: dbUser.avatar_url ?? null,
      role: dbUser.role as UserRole,
      status: dbUser.status as AccountStatus,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
    };

    return {
      token: authData.session.access_token,
      access_token: authData.session.access_token,
      user,
    };
  }

  async findUserById(userId: string): Promise<User | null> {
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, creator_number, avatar_url, role, status, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      creator_number: dbUser.creator_number ?? undefined,
      avatar_url: dbUser.avatar_url ?? null,
      role: dbUser.role as UserRole,
      status: dbUser.status as AccountStatus,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
    };
  }
}

export const authRepository = new AuthRepository();