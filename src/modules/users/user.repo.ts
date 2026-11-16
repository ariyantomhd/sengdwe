// src/modules/users/user.repo.ts
import { supabaseAdmin } from '../../config/supabase';

export type UserRoleType = 'BUYER' | 'CREATOR' | 'ADMIN';
export type UserAccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  creator_number: number | null;
  avatar_url: string | null;
  role: UserRoleType;
  status: UserAccountStatus;
  last_login_ip: string | null;
  last_device: string | null;
  last_country: string | null;
  is_vpn_detected: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  paid_orders_count?: number;
  total_spent?: number;
  licenses_count?: number;
}

export interface AdminUserFilters {
  role?: string;
  status?: string;
  vpnOnly?: boolean;
  search?: string;
}

const SAFE_USER_COLUMNS =
  'id, email, username, creator_number, avatar_url, role, status, last_login_ip, last_device, last_country, is_vpn_detected, last_seen_at, created_at, updated_at';

async function attachUserActivityMetrics(users: UserRecord[]): Promise<UserRecord[]> {
  const userIds = users.map((u) => u.id).filter(Boolean);
  if (userIds.length === 0) return users;

  const [ordersRes, licensesRes] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('buyer_id, payment_status, grand_total')
      .in('buyer_id', userIds),
    supabaseAdmin
      .from('licenses')
      .select('buyer_id')
      .in('buyer_id', userIds),
  ]);

  const orderStats: Record<string, { count: number; spent: number }> = {};
  if (Array.isArray(ordersRes.data)) {
    for (const row of ordersRes.data as Array<{
      buyer_id: string;
      payment_status: string;
      grand_total: number | string;
    }>) {
      if (String(row.payment_status || '').toUpperCase() === 'PAID') {
        if (!orderStats[row.buyer_id]) {
          orderStats[row.buyer_id] = { count: 0, spent: 0 };
        }
        orderStats[row.buyer_id].count += 1;
        orderStats[row.buyer_id].spent += Number(row.grand_total || 0);
      }
    }
  }

  const licenseCounts: Record<string, number> = {};
  if (Array.isArray(licensesRes.data)) {
    for (const row of licensesRes.data as Array<{ buyer_id: string }>) {
      licenseCounts[row.buyer_id] = (licenseCounts[row.buyer_id] || 0) + 1;
    }
  }

  return users.map((u) => ({
    ...u,
    role: String(u.role || 'BUYER').toUpperCase() as UserRoleType,
    status: String(u.status || 'PENDING').toUpperCase() as UserAccountStatus,
    is_vpn_detected: Boolean(u.is_vpn_detected),
    paid_orders_count: orderStats[u.id]?.count ?? 0,
    total_spent: Number((orderStats[u.id]?.spent ?? 0).toFixed(2)),
    licenses_count: licenseCounts[u.id] ?? 0,
  }));
}

export const userRepo = {
  async listAdminUsers(filters: AdminUserFilters): Promise<UserRecord[]> {
    let query = supabaseAdmin
      .from('users')
      .select(SAFE_USER_COLUMNS)
      .order('created_at', { ascending: false });

    if (filters.role && filters.role.toUpperCase() !== 'ALL') {
      query = query.eq('role', filters.role.toUpperCase());
    }

    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      query = query.eq('status', filters.status.toUpperCase());
    }

    if (filters.vpnOnly) {
      query = query.eq('is_vpn_detected', true);
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = filters.search.trim();
      query = query.or(
        `username.ilike.%${term}%,email.ilike.%${term}%,last_login_ip.ilike.%${term}%,last_device.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Gagal memuat daftar pengguna: ${error.message}`);
    }

    const rawUsers = (data || []) as UserRecord[];
    return await attachUserActivityMetrics(rawUsers);
  },

  async getUserById(userId: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(SAFE_USER_COLUMNS)
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    const [enriched] = await attachUserActivityMetrics([data as UserRecord]);
    return enriched || null;
  },

  async updateUserAccount(
    userId: string,
    payload: {
      role?: UserRoleType;
      status?: UserAccountStatus;
      creator_number?: number | null;
    }
  ): Promise<UserRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select(SAFE_USER_COLUMNS)
      .single();

    if (error || !data) {
      throw new Error(
        `Gagal memperbarui akun pengguna: ${error?.message || 'Pengguna tidak ditemukan'}`
      );
    }

    const [enriched] = await attachUserActivityMetrics([data as UserRecord]);
    return enriched;
  },
};