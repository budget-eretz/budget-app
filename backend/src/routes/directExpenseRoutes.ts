import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createDirectExpense,
  updateDirectExpense,
  deleteDirectExpense,
  getDirectExpenseById,
} from '../controllers/directExpenseController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create direct expense
router.post('/', createDirectExpense);

// Get direct expense by ID
router.get('/:id', getDirectExpenseById);

// Update direct expense
router.patch('/:id', updateDirectExpense);

// Delete direct expense
router.delete('/:id', deleteDirectExpense);

export default router;
