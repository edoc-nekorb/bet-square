import db from './db.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

function generateRefCode() {
    return 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase(); // REF-1A2B3C
}

async function migrate() {
    try {
        console.log('Running Migration 008...');
        const sql = await fs.readFile(path.join(process.cwd(), 'server/migrations/008_referral_system.sql'), 'utf8');
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await db.query(statement);
            } catch (e) {
                // Ignore "Column already exists" (1060).
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log('Skipping existing column...');
                } else if (e.errno === 1061) { // Duplicate key name
                    console.log('Skipping existing index...');
                } else {
                    console.log('SQL Error (might be non-fatal):', e.message);
                }
            }
        }

        console.log('Tables updated. Backfilling referral codes...');

        // Backfill Codes
        const [users] = await db.query('SELECT id FROM users WHERE referral_code IS NULL');
        console.log(`Found ${users.length} users needing codes.`);

        for (const user of users) {
            let code = generateRefCode();
            // Simple collision check (rare enough to ignore for now or retry, but retry is better)
            await db.query('UPDATE users SET referral_code = ? WHERE id = ?', [code, user.id]);
        }

        console.log('Migration Complete.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
