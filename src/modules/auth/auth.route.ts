// src/modules/auth/auth.route.ts
import { Router, type Request, type Response } from 'express';
import { authController } from './auth.controller';
import { verifyAdminAuth } from '../../middlewares/auth.middleware';
import type { AuthenticatedRequest } from '../../types/auth';

const router = Router();

router.post('/admin/auth/login', (req: Request, res: Response) => authController.login(req, res));
router.get('/admin/auth/me', verifyAdminAuth, (req: AuthenticatedRequest, res: Response) => authController.getProfile(req, res));
router.post('/admin/auth/logout', (req: Request, res: Response) => authController.logout(req, res));

export default router;