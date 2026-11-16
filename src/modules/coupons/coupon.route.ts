// src/modules/coupons/coupon.route.ts
import { Router } from 'express';
import { couponController } from './coupon.controller';

const router = Router();

router.get('/', couponController.getAllCoupons);
router.post('/', couponController.createCoupon);
router.patch('/:id', couponController.updateCoupon);
router.patch('/:id/toggle', couponController.toggleCouponStatus);
router.delete('/:id', couponController.deleteCoupon);

export default router;