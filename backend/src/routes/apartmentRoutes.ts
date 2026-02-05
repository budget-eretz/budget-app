import express from 'express';
import { authenticateToken, requireCircleTreasurer } from '../middleware/auth';
import {
  getAllApartments,
  getApartmentById,
  createApartment,
  updateApartment,
  deleteApartment,
  assignResidents,
  getApartmentExpenseSummary,
  getApartmentExpenseDetails
} from '../controllers/apartmentController';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all apartments (filtered by user role)
router.get('/', getAllApartments);

// Get apartment expense summary (report)
router.get('/expense-summary', getApartmentExpenseSummary);

// Get apartment by ID with residents
router.get('/:id', getApartmentById);

// Get apartment expense details (report)
router.get('/:id/expenses', getApartmentExpenseDetails);

// Create apartment (Circle Treasurer only)
router.post('/', requireCircleTreasurer, createApartment);

// Update apartment (Circle Treasurer only)
router.patch('/:id', requireCircleTreasurer, updateApartment);

// Delete apartment (Circle Treasurer only)
router.delete('/:id', requireCircleTreasurer, deleteApartment);

// Assign residents to apartment (Circle Treasurer only)
router.post('/:id/residents', requireCircleTreasurer, assignResidents);

export default router;
