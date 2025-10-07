import { Router } from 'express';
import * as fundController from '../controllers/fundController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/accessible', fundController.getAccessibleFunds);
router.get('/', fundController.getFunds);
router.get('/:id', fundController.getFundById);
router.post('/', requireTreasurer, fundController.createFund);
router.patch('/:id', requireTreasurer, fundController.updateFund);
router.delete('/:id', requireTreasurer, fundController.deleteFund);

export default router;
