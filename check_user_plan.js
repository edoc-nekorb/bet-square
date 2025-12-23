import db from './server/db.js';

async function check() {
    try {
        const [users] = await db.execute("SELECT id, email, plan, plan_expires_at FROM users WHERE email = 'test@example.com'");
        console.log('User State:', users[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
check();
