// src/modules/auth/auth.services.ts
import type { ApiResponse } from '../../types/index';
import type { User, LoginPayload, AuthTokenResponse } from '../../types/auth';
import { authRepository } from './auth.repo';

export class AuthService {
  async login(payload: LoginPayload): Promise<ApiResponse<AuthTokenResponse>> {
    if (!payload.email || !payload.password) {
      throw new Error('Email dan password wajib diisi.');
    }

    const authResult = await authRepository.authenticateAdmin(payload);

    return {
      success: true,
      message: 'Login admin berhasil.',
      data: authResult,
    };
  }

  async getProfile(userId: string): Promise<ApiResponse<User>> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new Error('Profil admin tidak ditemukan.');
    }

    return {
      success: true,
      data: user,
    };
  }
}

export const authService = new AuthService();