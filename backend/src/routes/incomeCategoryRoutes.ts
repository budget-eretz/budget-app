import { Router } from 'express';
import * as incomeCategoryController from '../controllers/incomeCategoryController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET / - Get all categories (accessible to all authenticated users)
router.get('/', incomeCategoryController.getCategories);

// POST / - Create new category (treasurer only)
router.post('/', requireTreasurer, incomeCategoryController.createCategory);

// PATCH /:id - Update category (treasurer only)
router.patch('/:id', requireTreasurer, incomeCategoryController.updateCategory);

// DELETE /:id - Delete category (treasurer only)
router.delete('/:id', requireTreasurer, incomeCategoryController.deleteCategory);

export default router;
