import { Router } from 'express';
import * as expectedIncomeController from '../controllers/expectedIncomeController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', expectedIncomeController.getExpectedIncomes);
router.get('/:id', expectedIncomeController.getExpectedIncome);
router.post('/annual', requireTreasurer, expectedIncomeController.createAnnualPlanning);
router.post('/monthly', expectedIncomeController.createMonthlyExpectedIncome);
router.patch('/:id', expectedIncomeController.updateExpectedIncome);
router.delete('/:id', expectedIncomeController.deleteExpectedIncome);
router.post('/:id/categories', expectedIncomeController.assignCategories);

export default router;
