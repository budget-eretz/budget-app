import runMigrations from './db/migrate';
import pool from './config/database';
import bcrypt from 'bcrypt';

async function seedIfEmpty() {
  const client = await pool.connect();
  try {
    // Check if there are any users
    const result = await client.query('SELECT COUNT(*) FROM users');
    const userCount = parseInt(result.rows[0].count);
    
    if (userCount === 0) {
      console.log('📦 No users found, creating circle treasurer...');
      
      await client.query('BEGIN');
      
      // Create circle treasurer only
      const hashedPassword123456 = await bcrypt.hash('123456', 10);
      
      await client.query(`
        INSERT INTO users (email, password_hash, full_name, phone, is_circle_treasurer)
        VALUES ('gizbarit@test.com', $1, 'גזברית מעגל', '050-1234567', TRUE)
      `, [hashedPassword123456]);

      await client.query('COMMIT');
      
      console.log('✅ Circle treasurer created successfully!');
      console.log('📝 Login: gizbarit@test.com / 123456');
    } else {
      console.log(`✅ Database already has ${userCount} users, skipping seed`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
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
