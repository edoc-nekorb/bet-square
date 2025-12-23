import db from './server/db.js';

async function check() {
    try {
        const [rows] = await db.execute("DESCRIBE transactions");
        console.log('--- TRANSACTIONS COLUMNS ---');
        console.table(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
