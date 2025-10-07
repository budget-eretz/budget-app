import { Router } from 'express';
import * as budgetController from '../controllers/budgetController';
import { authenticateToken, requireCircleTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', budgetController.getBudgets);
router.get('/:id', budgetController.getBudgetById);
router.get('/:budgetId/monthly-status/:year/:month', budgetController.getBudgetMonthlyStatus);
router.post('/', requireCircleTreasurer, budgetController.createBudget);
router.patch('/:id', requireCircleTreasurer, budgetController.updateBudget);
router.delete('/:id', requireCircleTreasurer, budgetController.deleteBudget);
router.post('/transfer', requireCircleTreasurer, budgetController.transferBudget);

export default router;
