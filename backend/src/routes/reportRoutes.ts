import { Router } from 'express';
import * as reportController from '../controllers/reportController';
import { authenticateToken, requireTreasurer } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Existing routes
router.get('/dashboard', reportController.getDashboard);
router.get('/payments', requireTreasurer, reportController.getPaymentsList);
router.get('/budget/:id', reportController.getBudgetReport);

// New report endpoints
router.get('/monthly-closing/:year/:month', requireTreasurer, reportController.getMonthlyClosingReport);
router.get('/annual-budget-execution/:year', requireTreasurer, reportController.getAnnualBudgetExecutionReport);
router.get('/expense-execution/:year', requireTreasurer, reportController.getExpenseExecutionReport);
router.get('/expense-execution/:year/:month', requireTreasurer, reportController.getExpenseExecutionReport);
router.get('/income-execution/:year', requireTreasurer, reportController.getIncomeExecutionReport);
router.get('/income-execution/:year/:month', requireTreasurer, reportController.getIncomeExecutionReport);

// Export endpoints
router.get('/export/monthly-closing/:year/:month', requireTreasurer, reportController.exportMonthlyClosingReport);
router.get('/export/annual-budget-execution/:year', requireTreasurer, reportController.exportAnnualBudgetExecutionReport);
router.get('/export/expense-execution/:year', requireTreasurer, reportController.exportExpenseExecutionReport);
router.get('/export/expense-execution/:year/:month', requireTreasurer, reportController.exportExpenseExecutionReport);
router.get('/export/income-execution/:year', requireTreasurer, reportController.exportIncomeExecutionReport);
router.get('/export/income-execution/:year/:month', requireTreasurer, reportController.exportIncomeExecutionReport);

// Data validation endpoints
router.post('/validate/consistency', requireTreasurer, reportController.validateReportsConsistency);
router.get('/validate/data-sources/:year', requireTreasurer, reportController.validateDataSources);
router.get('/validate/data-sources/:year/:month', requireTreasurer, reportController.validateDataSources);

// Budget fund details endpoint for collapsible rows
router.get('/budget-fund-details/:budgetId/:year/:month', requireTreasurer, reportController.getBudgetFundDetails);

// Category income details endpoint for collapsible rows
router.get('/category-income-details/:categoryId/:year/:month', requireTreasurer, reportController.getCategoryIncomeDetails);

export default router;
