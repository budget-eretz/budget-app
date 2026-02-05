import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';
import authRoutes from './routes/authRoutes';
import budgetRoutes from './routes/budgetRoutes';
import fundRoutes from './routes/fundRoutes';
import plannedExpenseRoutes from './routes/plannedExpenseRoutes';
import reimbursementRoutes from './routes/reimbursementRoutes';
import chargeRoutes from './routes/chargeRoutes';
import incomeRoutes from './routes/incomeRoutes';
import incomeCategoryRoutes from './routes/incomeCategoryRoutes';
import expectedIncomeRoutes from './routes/expectedIncomeRoutes';
import reportRoutes from './routes/reportRoutes';
import userRoutes from './routes/userRoutes';
import groupRoutes from './routes/groupRoutes';
import paymentTransferRoutes from './routes/paymentTransferRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import directExpenseRoutes from './routes/directExpenseRoutes';
import recurringTransferRoutes from './routes/recurringTransferRoutes';
import apartmentRoutes from './routes/apartmentRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://budget-app-frontend-mcfs.onrender.com', 'https://www.eretz.org.il', 'https://eretz.org.il']
    : ['http://localhost:3456', 'http://localhost:3000'],
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Type']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Budget App API is running' });
});

// Note: Migrations now run automatically on startup via start.ts
// No need for temporary migration endpoints anymore

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/planned-expenses', plannedExpenseRoutes);
app.use('/api/reimbursements', reimbursementRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/income-categories', incomeCategoryRoutes);
app.use('/api/expected-incomes', expectedIncomeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/payment-transfers', paymentTransferRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/direct-expenses', directExpenseRoutes);
app.use('/api/recurring-transfers', recurringTransferRoutes);
app.use('/api/apartments', apartmentRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
