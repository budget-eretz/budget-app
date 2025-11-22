import runMigrations from './db/migrate';
import pool from './config/database';
import { runInitialSeed } from './db/seed-initial';

async function seedIfEmpty() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COUNT(*) AS count FROM users');
    const userCount = parseInt(rows[0].count, 10);

    if (userCount === 0) {
      console.log('📦 No users found, running initial seed...');
      await runInitialSeed({ closePool: false });
      console.log('✅ Initial seed completed');
    } else {
      console.log(`✅ Database already has ${userCount} users, skipping seed`);
    }
  } finally {
    client.release();
  }
}

async function start() {
  try {
    console.log('🔄 Running migrations...');
    await runMigrations();
    console.log('✅ Migrations completed successfully');
    
    console.log('🔄 Checking if seed is needed...');
    await seedIfEmpty();
    
    console.log('🚀 Starting server...');
    await import('./server');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

start();
