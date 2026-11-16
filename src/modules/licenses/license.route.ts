// src/modules/licenses/license.route.ts
import { Router } from 'express';
import { licenseController } from './license.controller';

const router = Router();

router.get('/', licenseController.getAllLicenses);
router.patch('/:id/status', licenseController.updateStatus);
router.post('/:id/reset-domains', licenseController.resetDomains);

export default router;