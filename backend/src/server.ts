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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Budget App API is running' });
});

// Temporary migration endpoint (remove after first use!)
app.post('/run-migrations-temp-endpoint-delete-me', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const client = await pool.connect();

    try {
      // Create migrations tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT NOW()
        );
      `);

      const migrationsDir = path.join(__dirname, '../migrations');
      const files = fs.readdirSync(migrationsDir).sort();
      const results = [];

      for (const file of files) {
        if (!file.endsWith('.sql')) continue;

        const result = await client.query(
          'SELECT id FROM migrations WHERE name = $1',
          [file]
        );

        if (result.rows.length > 0) {
          results.push(`⏭️  Skipped ${file}`);
          continue;
        }

        const sqlPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          results.push(`✅ Executed ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      client.release();
      res.json({ success: true, results });
    } catch (error) {
      client.release();
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
