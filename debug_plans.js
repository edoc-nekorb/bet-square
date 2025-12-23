
import db from './server/db.js';

async function debugState() {
    try {
        console.log('--- SUBSCRIPTION PLANS ---');
        const [plans] = await db.execute('SELECT * FROM subscription_plans');
        console.log(plans);

        console.log('\n--- TARGET USER (LAST UPDATED) ---');
        // Get the user most recently updated
        // We don't have an updated_at column, so we'll just check all users with a plan that isn't free
        const [users] = await db.execute("SELECT id, email, plan, plan_expires_at, role FROM users WHERE plan != 'free' OR plan IS NOT NULL LIMIT 5");
        console.log(users);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugState();
