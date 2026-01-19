import { Router } from 'express';
import * as budgetController from '../controllers/budgetController';
import { authenticateToken, requireCircleTreasurer, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', budgetController.getBudgets);
router.get('/:id', budgetController.getBudgetById);
router.get('/:budgetId/monthly-status/:year/:month', budgetController.getBudgetMonthlyStatus);
router.post('/', requireCircleTreasurer, budgetController.createBudget);
router.patch('/:id', requireTreasurer, budgetController.updateBudget); // Changed to requireTreasurer
router.delete('/:id', requireCircleTreasurer, budgetController.deleteBudget);
router.post('/transfer', requireTreasurer, budgetController.transferBudget); // Changed to requireTreasurer

export default router;
