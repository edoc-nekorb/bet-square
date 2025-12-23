
import db from './server/db.js';

async function checkAdmin() {
    try {
        const [rows] = await db.execute('SELECT id, email, role, full_name FROM users WHERE role = "admin"');
        console.log('Admin Users:', rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAdmin();
