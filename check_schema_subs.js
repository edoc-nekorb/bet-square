
import db from './server/db.js';

async function checkSchema() {
    try {
        console.log('--- USERS COLUMNS ---');
        const [usersCols] = await db.execute('SHOW COLUMNS FROM users');
        console.log(usersCols.map(c => c.Field));

        console.log('\n--- SUBSCRIPTION_PLANS COLUMNS ---');
        const [plansCols] = await db.execute('SHOW COLUMNS FROM subscription_plans');
        console.log(plansCols.map(c => c.Field));

        console.log('\n--- USER_SUBSCRIPTIONS COLUMNS ---');
        try {
            const [subsCols] = await db.execute('SHOW COLUMNS FROM user_subscriptions');
            console.log(subsCols.map(c => c.Field));
        } catch (e) { console.log('user_subscriptions table might not exist'); }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
