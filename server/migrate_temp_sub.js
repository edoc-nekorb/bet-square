
import db from './db.js';
import fs from 'fs/promises';
import path from 'path';

async function migrate() {
    try {
        const sql = await fs.readFile(path.join(process.cwd(), 'server/migrations/007_subscription_system.sql'), 'utf8');
        // Split by semicolon to handle multiple statements if needed, though db.query usually handles it if configured.
        // But for safety with mysql2 default, splitting is often better or using multipleStatements: true config.
        // Assuming db.js might not have multipleStatements: true, let's split.
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const statement of statements) {
            await db.query(statement);
        }
        console.log('Migration 007 executed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
