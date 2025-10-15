import runMigrations from './db/migrate';

async function start() {
  try {
    console.log('🔄 Running migrations...');
    await runMigrations();
    console.log('✅ Migrations completed successfully');
    
    console.log('🚀 Starting server...');
    await import('./server');
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

start();
