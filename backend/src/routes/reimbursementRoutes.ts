import { Router } from 'express';
import * as reimbursementController from '../controllers/reimbursementController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/my/summary', reimbursementController.getMySummary);
router.get('/my', reimbursementController.getMyReimbursements);
router.get('/treasurer/all', requireTreasurer, reimbursementController.getTreasurerReimbursements);
router.get('/', reimbursementController.getReimbursements);
router.get('/:id', reimbursementController.getReimbursementById);
router.post('/', reimbursementController.createReimbursement);
router.patch('/:id', reimbursementController.updateReimbursement);
router.delete('/:id', reimbursementController.deleteReimbursement);

// Batch operations (must come before single ID routes)
router.post('/batch/approve', requireTreasurer, reimbursementController.batchApprove);
router.post('/batch/reject', requireTreasurer, reimbursementController.batchReject);
router.post('/batch/mark-review', requireTreasurer, reimbursementController.batchMarkForReview);
router.post('/batch/mark-paid', requireTreasurer, reimbursementController.batchMarkAsPaid);

// Single reimbursement operations
router.post('/:id/approve', requireTreasurer, reimbursementController.approveReimbursement);
router.post('/:id/reject', requireTreasurer, reimbursementController.rejectReimbursement);
router.post('/:id/paid', requireTreasurer, reimbursementController.markAsPaid);
router.post('/:id/mark-review', requireTreasurer, reimbursementController.markForReview);
router.post('/:id/return-to-pending', requireTreasurer, reimbursementController.returnToPending);

export default router;
