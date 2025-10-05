import { Router } from 'express';
import * as incomeController from '../controllers/incomeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', incomeController.getIncomes);
router.post('/', incomeController.createIncome);
router.delete('/:id', incomeController.deleteIncome);

export default router;
