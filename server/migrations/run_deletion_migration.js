import '../env.js';
import db from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    try {
        // 1. Modify Status Column (Fix for truncation error)
        const statusSqlPath = path.join(__dirname, 'modify_status_column.sql');
        const statusSql = fs.readFileSync(statusSqlPath, 'utf8');
        try {
            await db.query(statusSql);
            console.log('Modified status column successfully');
        } catch (e) {
            console.log('Status column modification skipped or failed:', e.message);
        }

        // 2. Run Deletion Flow Migration
        const sqlPath = path.join(__dirname, 'create_deletion_flow.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split statements by semicolon, filter empty ones
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} statements to run.`);

        for (const statement of statements) {
            try {
                await db.query(statement);
                console.log('Executed statement successfully');
            } catch (e) {
                // Ignore "duplicate column" errors for idempotency
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log('Column already exists, skipping.');
                } else if (e.code === 'ER_TABLE_EXISTS_ERROR') { // In case IF NOT EXISTS fails or is missing
                    console.log('Table already exists, skipping.');
                } else {
                    console.error('Statement failed:', e.message);
                    // Don't throw, try next statement
                }
            }
        }

        console.log('Deletion flow migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
