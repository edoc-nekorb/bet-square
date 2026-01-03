import db from './db.js';

async function run() {
    try {
        console.log("Adding description column...");
        await db.query("ALTER TABLE transactions ADD COLUMN description TEXT");
    } catch (e) { console.log("Description col error (likely exists):", e.message); }

    try {
        console.log("Adding bank_details column...");
        await db.query("ALTER TABLE transactions ADD COLUMN bank_details JSON");
    } catch (e) { console.log("Bank details col error:", e.message); }

    console.log("Migration P2 success");
    process.exit();
}

run();
