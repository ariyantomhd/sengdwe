// src/modules/dashboard/dashboard.route.ts
import { Router } from 'express';
import { verifyAdminAuth } from '../../middlewares/auth.middleware';
import { dashboardController } from './dashboard.controller';

const router = Router();

router.get('/', verifyAdminAuth, dashboardController.getSummary);

export default router;