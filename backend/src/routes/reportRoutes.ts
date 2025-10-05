import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', reportController.getDashboard);
router.get('/payments', requireTreasurer, reportController.getPaymentsList);
router.get('/budget/:id', reportController.getBudgetReport);

export default router;
