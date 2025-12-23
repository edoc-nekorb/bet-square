// Migration script to add username column to users table
import db from './server/db.js';

async function migrate() {
    try {
        console.log('Running migration: Add username column...');

        // Check if column exists first
        const [columns] = await db.execute("SHOW COLUMNS FROM users LIKE 'username'");

        if (columns.length === 0) {
            await db.execute(`
                ALTER TABLE users 
                ADD COLUMN username VARCHAR(50) DEFAULT NULL
            `);
            console.log('✅ Added username column');

            // Update existing users: use first name from full_name or email prefix
            await db.execute(`
                UPDATE users 
                SET username = COALESCE(
                    SUBSTRING_INDEX(full_name, ' ', 1),
                    SUBSTRING_INDEX(email, '@', 1)
                )
                WHERE username IS NULL
            `);
            console.log('✅ Updated existing users with default usernames');
        } else {
            console.log('ℹ️ username column already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

migrate();
