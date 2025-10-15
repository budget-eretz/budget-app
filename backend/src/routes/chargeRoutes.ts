import express from 'express';
import * as chargeController from '../controllers/chargeController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Treasurer routes (must be before /:id routes)
router.get('/treasurer/all', requireTreasurer, chargeController.getTreasurerCharges);
router.post('/batch/approve', requireTreasurer, chargeController.batchApprove);
router.post('/batch/reject', requireTreasurer, chargeController.batchReject);
router.post('/batch/mark-review', requireTreasurer, chargeController.batchMarkForReview);

// User routes
router.get('/my', chargeController.getMyCharges);
router.get('/', chargeController.getCharges);
router.get('/:id', chargeController.getChargeById);
router.post('/', chargeController.createCharge);
router.patch('/:id', chargeController.updateCharge);
router.delete('/:id', chargeController.deleteCharge);
router.post('/:id/mark-review', requireTreasurer, chargeController.markForReview);
router.post('/:id/return-to-pending', requireTreasurer, chargeController.returnToPending);

export default router;
