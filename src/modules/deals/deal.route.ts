// src/modules/deals/deal.route.ts
import { Router } from 'express';
import { dealController } from './deal.controller';

const router = Router();

router.get('/', dealController.getAllDeals);
router.post('/', dealController.createDeal);
router.patch('/:id', dealController.updateDeal);
router.patch('/:id/toggle', dealController.toggleDealStatus);
router.delete('/:id', dealController.deleteDeal);

export default router;