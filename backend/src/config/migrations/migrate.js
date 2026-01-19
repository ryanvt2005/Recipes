const fs = require('fs');
const path = require('path');
const pool = require('../database');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    // Run main schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('✓ Main schema applied');

    // Run numbered migrations in order (these handle ALTER TABLE statements)
    const migrationFiles = fs
      .readdirSync(__dirname)
      .filter((f) => /^\d+_.*\.sql$/.test(f))
      .sort();

    for (const file of migrationFiles) {
      const migrationPath = path.join(__dirname, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      try {
        await pool.query(sql);
        console.log(`✓ Applied ${file}`);
      } catch (err) {
        // Ignore errors for "already exists" type issues
        if (
          err.message.includes('already exists') ||
          err.message.includes('duplicate key') ||
          err.message.includes('does not exist')
        ) {
          console.log(`⏭ Skipped ${file} (already applied or not needed)`);
        } else {
          throw err;
        }
      }
    }

    console.log('✓ Database migrations completed successfully');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
