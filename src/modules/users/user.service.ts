// src/modules/users/user.service.ts
import {
  userRepo,
  AdminUserFilters,
  UserAccountStatus,
  UserRecord,
  UserRoleType,
} from './user.repo';

const ALLOWED_ROLES: UserRoleType[] = ['BUYER', 'CREATOR', 'ADMIN'];
const ALLOWED_STATUSES: UserAccountStatus[] = ['ACTIVE', 'PENDING', 'SUSPENDED'];

export const userService = {
  async listUsers(filters: AdminUserFilters): Promise<UserRecord[]> {
    return await userRepo.listAdminUsers(filters);
  },

  async updateUserRole(userId: string, nextRoleRaw: string): Promise<UserRecord> {
    const existing = await userRepo.getUserById(userId);
    if (!existing) {
      throw new Error('Akun pengguna tidak ditemukan.');
    }

    const nextRole = String(nextRoleRaw || '').toUpperCase() as UserRoleType;
    if (!ALLOWED_ROLES.includes(nextRole)) {
      throw new Error(`Role "${nextRoleRaw}" tidak valid. Gunakan BUYER, CREATOR, atau ADMIN.`);
    }

    const creatorNumber =
      nextRole === 'CREATOR' && !existing.creator_number
        ? Math.floor(1000 + Math.random() * 9000)
        : existing.creator_number;

    return await userRepo.updateUserAccount(userId, {
      role: nextRole,
      creator_number: creatorNumber,
    });
  },

  async updateUserStatus(userId: string, nextStatusRaw: string): Promise<UserRecord> {
    const existing = await userRepo.getUserById(userId);
    if (!existing) {
      throw new Error('Akun pengguna tidak ditemukan.');
    }

    const nextStatus = String(nextStatusRaw || '').toUpperCase() as UserAccountStatus;
    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      throw new Error(
        `Status "${nextStatusRaw}" tidak valid. Gunakan ACTIVE, PENDING, atau SUSPENDED.`
      );
    }

    if (existing.role === 'ADMIN' && nextStatus === 'SUSPENDED') {
      throw new Error('Akun dengan role ADMIN tidak dapat di-suspend secara langsung.');
    }

    return await userRepo.updateUserAccount(userId, {
      status: nextStatus,
    });
  },
};