import { Router } from 'express';
import * as fundController from '../controllers/fundController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Dashboard monthly status endpoint
router.get('/monthly-status', fundController.getDashboardMonthlyStatus);

export default router;
