import { Router } from 'express';
import * as incomeController from '../controllers/incomeController';
import * as expectedIncomeController from '../controllers/expectedIncomeController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Comparison and dashboard routes
router.get('/comparison/monthly/:year/:month', expectedIncomeController.getMonthlyComparison);
router.get('/dashboard/summary', expectedIncomeController.getDashboardSummary);

// Income routes
router.get('/', incomeController.getIncomes);
router.post('/', incomeController.createIncome);
router.patch('/:id', requireTreasurer, incomeController.updateIncome);
router.post('/:id/categories', requireTreasurer, incomeController.assignCategories);
router.delete('/:id', incomeController.deleteIncome);

export default router;
