// src/modules/orders/order.route.ts
import { Router } from 'express';
import { orderController } from './order.controller';
// Sesuaikan import middleware auth & admin guard di project backend abang:
// import { requireAuth, requireAdmin } from '../../middlewares/auth.middleware';

const router = Router();

// Jika middleware admin sudah siap, aktifkan:
// router.use(requireAuth, requireAdmin);

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderDetail);
router.patch('/:id/status', orderController.updateOrderStatus);

export default router;