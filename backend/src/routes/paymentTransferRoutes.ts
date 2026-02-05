import { Router } from 'express';
import * as paymentTransferController from '../controllers/paymentTransferController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Apply treasurer authorization to all routes
router.use(requireTreasurer);

// Get payment transfer statistics
router.get('/stats', paymentTransferController.getPaymentTransferStats);

// Get all payment transfers (with filtering)
router.get('/', paymentTransferController.getPaymentTransfers);

// Generate payment transfers for users with recurring transfers
router.post('/generate-recurring', paymentTransferController.generateRecurringTransfers);

// Get single payment transfer details
router.get('/:id', paymentTransferController.getPaymentTransferById);

// Execute payment transfer
router.post('/:id/execute', paymentTransferController.executePaymentTransfer);

// Delete a recurring transfer application from a payment transfer
router.delete('/:transferId/recurring-application/:applicationId', paymentTransferController.deleteRecurringApplication);

export default router;
