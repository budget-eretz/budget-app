import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getRecurringTransfers,
  getMyRecurringTransfers,
  getRecurringTransferById,
  createRecurringTransfer,
  updateRecurringTransfer,
  deleteRecurringTransfer
} from '../controllers/recurringTransferController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all recurring transfers (treasurer only, filtered by access)
router.get('/', getRecurringTransfers);

// Get user's recurring transfers
router.get('/my', getMyRecurringTransfers);

// Get single recurring transfer by ID
router.get('/:id', getRecurringTransferById);

// Create recurring transfer (treasurer only)
router.post('/', createRecurringTransfer);

// Update recurring transfer (treasurer only)
router.patch('/:id', updateRecurringTransfer);

// Delete recurring transfer (treasurer only)
router.delete('/:id', deleteRecurringTransfer);

export default router;
