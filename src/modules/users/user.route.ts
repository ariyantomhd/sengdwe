// src/modules/users/user.route.ts
import { Router } from 'express';
import { userController } from './user.controller';

const router = Router();

router.get('/', userController.getAllUsers);
router.patch('/:id/role', userController.changeRole);
router.patch('/:id/status', userController.changeStatus);

export default router;