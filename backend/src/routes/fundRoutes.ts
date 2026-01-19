import { Router } from 'express';
import * as fundController from '../controllers/fundController';
import * as fundMonthlyAllocationController from '../controllers/fundMonthlyAllocationController';
import { authenticateToken, requireTreasurer, requireCircleTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/accessible', fundController.getAccessibleFunds);
router.get('/', fundController.getFunds);
router.get('/:id', fundController.getFundById);
router.post('/move-items', requireTreasurer, fundController.moveFundItems);
router.post('/', requireTreasurer, fundController.createFund);
router.patch('/:id', requireTreasurer, fundController.updateFund);
router.delete('/:id', requireTreasurer, fundController.deleteFund);

// Monthly allocation routes
router.post('/:fundId/monthly-allocations/fixed', fundMonthlyAllocationController.setFixedAllocation);
router.post('/:fundId/monthly-allocations/variable', fundMonthlyAllocationController.setVariableAllocations);
router.get('/:fundId/monthly-allocations', fundMonthlyAllocationController.getAllocations);
router.get('/:fundId/monthly-allocations/:year/:month', fundMonthlyAllocationController.getMonthAllocation);
router.delete('/:fundId/monthly-allocations/:year/:month', fundMonthlyAllocationController.deleteMonthAllocation);

// Monthly status and data routes
router.get('/:fundId/monthly-status/:year/:month', fundController.getMonthlyStatus);
router.get('/:fundId/monthly-expenses/:year/:month', fundController.getMonthlyExpenses);
router.get('/:fundId/monthly-planned/:year/:month', fundController.getMonthlyPlannedExpenses);

// Allocation history route
router.get('/:fundId/allocation-history', fundController.getAllocationHistory);

export default router;
