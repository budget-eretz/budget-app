import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  // Connection pool settings for better reliability
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit the process - let the pool handle reconnection
  // Only log the error and continue
});

pool.on('connect', () => {
  console.log('Database connection established');
});

export default pool;
