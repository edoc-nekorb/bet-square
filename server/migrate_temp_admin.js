
import db from './db.js';
import fs from 'fs/promises';
import path from 'path';

async function migrate() {
    try {
        const sql = await fs.readFile(path.join(process.cwd(), 'server/migrations/006_add_user_fields.sql'), 'utf8');
        await db.query(sql);
        console.log('Migration 006 executed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
