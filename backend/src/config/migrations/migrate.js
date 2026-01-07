const fs = require('fs');
const path = require('path');
const pool = require('../database');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);

    console.log('✓ Database schema created successfully');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
