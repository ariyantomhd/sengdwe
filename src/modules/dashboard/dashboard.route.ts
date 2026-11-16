// src/modules/dashboard/dashboard.route.ts
import { Router } from 'express';
import { dashboardController } from './dashboard.controller';

const router = Router();

router.get('/', dashboardController.getSummary);

export default router;