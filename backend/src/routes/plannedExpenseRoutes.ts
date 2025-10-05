import { Router } from 'express';
import * as plannedExpenseController from '../controllers/plannedExpenseController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', plannedExpenseController.getPlannedExpenses);
router.post('/', plannedExpenseController.createPlannedExpense);
router.patch('/:id', plannedExpenseController.updatePlannedExpense);
router.delete('/:id', plannedExpenseController.deletePlannedExpense);

export default router;
