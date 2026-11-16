// src/modules/reviews/review.route.ts
import { Router } from 'express';
import { reviewController } from './review.controller';

const router = Router();

router.get('/', reviewController.getAllReviews);
router.post('/inject', reviewController.createInjectedReview);
router.patch('/:id', reviewController.updateReview);
router.patch('/:id/toggle', reviewController.toggleApproval);
router.delete('/:id', reviewController.deleteReview);

export default router;