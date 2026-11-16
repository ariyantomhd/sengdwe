// src/modules/licenses/license.service.ts
import {
  licenseRepo,
  AdminLicenseFilters,
  LicenseRecord,
  LicenseStatusType,
} from './license.repo';

const ALLOWED_STATUSES: LicenseStatusType[] = ['ACTIVE', 'REVOKED', 'EXPIRED', 'SUSPENDED'];

export const licenseService = {
  async listLicenses(filters: AdminLicenseFilters): Promise<LicenseRecord[]> {
    return await licenseRepo.listAdminLicenses(filters);
  },

  async changeStatus(licenseId: string, nextStatusRaw: string): Promise<LicenseRecord> {
    const existing = await licenseRepo.getLicenseById(licenseId);
    if (!existing) {
      throw new Error('Data lisensi tidak ditemukan.');
    }

    const nextStatus = String(nextStatusRaw || '').toUpperCase() as LicenseStatusType;
    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      throw new Error(`Status lisensi "${nextStatusRaw}" tidak valid.`);
    }

    return await licenseRepo.updateLicenseStatus(licenseId, nextStatus);
  },

  async resetAllDomains(licenseId: string): Promise<LicenseRecord> {
    const existing = await licenseRepo.getLicenseById(licenseId);
    if (!existing) {
      throw new Error('Data lisensi tidak ditemukan.');
    }

    return await licenseRepo.updateActivatedDomains(licenseId, []);
  },

  async removeSingleDomain(licenseId: string, domainToRemove: string): Promise<LicenseRecord> {
    const existing = await licenseRepo.getLicenseById(licenseId);
    if (!existing) {
      throw new Error('Data lisensi tidak ditemukan.');
    }

    const target = domainToRemove.trim().toLowerCase();
    const remaining = existing.activated_domains.filter(
      (d) => d.trim().toLowerCase() !== target
    );

    return await licenseRepo.updateActivatedDomains(licenseId, remaining);
  },
};