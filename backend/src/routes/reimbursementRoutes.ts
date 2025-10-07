import { Router } from 'express';
import * as reimbursementController from '../controllers/reimbursementController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/my/summary', reimbursementController.getMySummary);
router.get('/my', reimbursementController.getMyReimbursements);
router.get('/', reimbursementController.getReimbursements);
router.get('/:id', reimbursementController.getReimbursementById);
router.post('/', reimbursementController.createReimbursement);
router.patch('/:id', reimbursementController.updateReimbursement);
router.delete('/:id', reimbursementController.deleteReimbursement);
router.post('/:id/approve', requireTreasurer, reimbursementController.approveReimbursement);
router.post('/:id/reject', requireTreasurer, reimbursementController.rejectReimbursement);
router.post('/:id/paid', requireTreasurer, reimbursementController.markAsPaid);

export default router;
