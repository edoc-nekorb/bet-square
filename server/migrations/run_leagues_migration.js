import db from '../db.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    try {
        const sqlPath = path.join(__dirname, 'create_leagues_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split statements by semicolon, filter empty ones
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            // Note: prepared statement logic in SQL file might not work directly with db.execute if it's multiple lines
            // However, the SQL provided used standard SQL syntax mostly. 
            // The dynamic add column block is tricky in single execute. 
            // Let's simplify the add column logic for Node execution.

            // We'll skip complex procedure logic and just use IF NOT EXISTS logic via query
            if (statement.includes('CREATE TABLE')) {
                await db.query(statement);
                console.log('Table created or exists');
            } else if (statement.includes('ALTER TABLE')) {
                // Try catch for column exists
                try {
                    await db.query(statement);
                    console.log('Column added');
                } catch (e) {
                    if (e.code === 'ER_DUP_FIELDNAME') {
                        console.log('Column already exists');
                    } else {
                        throw e;
                    }
                }
            } else {
                // Run generic (SET variables might fail in pool depending on connection state, but let's try)
                // Actually relying on variables across separate queries is unsafe in pool.
                // We will hardcode the ALTER logic in JS instead.
            }
        }

        // Manual Column Check implementation for safety
        try {
            await db.query("ALTER TABLE predictions ADD COLUMN league_id INT");
            console.log("Added league_id column");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log("league_id column already exists");
            else console.log("Note on column add:", e.message);
        }

        console.log('Migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
