import db from './db.js';

async function run() {
    try {
        console.log("Adding subscription_id column to referral_earnings...");
        await db.query("ALTER TABLE referral_earnings ADD COLUMN subscription_id INT");
        console.log("Success.");
    } catch (e) {
        console.log("Error (column might exist):", e.message);
    }
    process.exit();
}

run();
