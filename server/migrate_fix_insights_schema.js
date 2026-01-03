import db from './db.js';

async function run() {
    try {
        console.log("Adding home_club_id and away_club_id to match_insights...");
        await db.query("ALTER TABLE match_insights ADD COLUMN home_club_id INT, ADD COLUMN away_club_id INT");
        console.log("Success.");
    } catch (e) {
        console.log("Error (columns might exist):", e.message);
    }
    process.exit();
}

run();
