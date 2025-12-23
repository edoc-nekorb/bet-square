
import db from './server/db.js';

async function migrate() {
    try {
        console.log('Modifying users.plan column to VARCHAR(255)...');
        await db.execute("ALTER TABLE users MODIFY COLUMN plan VARCHAR(255) DEFAULT 'free'");
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
