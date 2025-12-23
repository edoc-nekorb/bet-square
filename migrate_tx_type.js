import db from './server/db.js';

async function migrate() {
    try {
        console.log('Altering transactions table...');
        await db.execute("ALTER TABLE transactions MODIFY COLUMN type ENUM('deposit', 'withdrawal', 'subscription') DEFAULT 'deposit'");
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
    process.exit();
}
migrate();
