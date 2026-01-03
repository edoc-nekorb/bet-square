import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const LOG_FILE = '/Users/billz/Desktop/BigtreeAi/bet-square-ui/server_debug.log';

function log(msg) {
    const time = new Date().toISOString();
    const logLine = `[${time}] ${msg}\n`;
    console.log(msg);
    try {
        fs.appendFileSync(LOG_FILE, logLine);
    } catch (e) { console.error('Log write failed:', e); }
}

// Log startup
log('[Admin] Admin route module loaded.');

// Middleware to check for Admin Role
const isAdmin = (req, res, next) => {
    log(`[Admin] Request: ${req.method} ${req.url}`);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        log('[Admin] No token');
        return res.status(401).json({ error: 'No token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // In a real app, verify role from DB too to be safe, but token claim is ok for now if trusted
        if (decoded.role !== 'admin') {
            log('[Admin] Not admin access denied');
            return res.status(403).json({ error: 'Access denied: Admins only' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        log(`[Admin] Token error: ${err.message}`);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Apply isAdmin to all routes in this router
router.use(isAdmin);

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        // Fetch all users
        const [users] = await db.execute(`
            SELECT id, full_name as name, email, role, plan, status, balance, created_at as joined 
            FROM users 
            ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/users (Create User)
router.post('/users', async (req, res) => {
    const { name, email, password, role, plan, status } = req.body;

    // Basic validation
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if exists
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already in use' });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert
        await db.execute(`
            INSERT INTO users (full_name, email, password, role, plan, status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, email, hashedPassword, role || 'user', plan || 'free', status || 'Active']);

        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PUT /api/admin/users/:id (Update User)
router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, plan, status, balance } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get current user to check if plan changed
        const [currentUser] = await connection.execute('SELECT plan, plan_expires_at FROM users WHERE id = ?', [id]);

        let newExpiresAt = null;
        let shouldCreateSubscription = false;
        let planId = null;

        // If plan is changing OR if current plan is valid but has no expiration (fix broken state)
        log(`[Admin] Updating user ${id}. Plan: ${plan}, OldPlan: ${currentUser[0]?.plan}, OldExpires: ${currentUser[0]?.plan_expires_at}`);

        const planChanged = plan && plan !== currentUser[0].plan;
        const missingExpiry = plan !== 'free' && !currentUser[0].plan_expires_at;

        log(`[Admin] Conditions - planChanged: ${planChanged}, missingExpiry: ${missingExpiry}`);

        if (currentUser.length > 0 && (planChanged || missingExpiry)) {
            if (plan === 'free') {
                newExpiresAt = null; // Reset expiration for free tier
                log('[Admin] Plan set to free. Expiration cleared.');
            } else {
                // Find the plan details
                const [planDetails] = await connection.execute('SELECT * FROM subscription_plans WHERE name = ?', [plan]);
                log(`[Admin] Plan lookup for "${plan}": found ${planDetails.length} matches`);

                if (planDetails.length > 0) {
                    const p = planDetails[0];
                    planId = p.id;
                    const duration = p.duration_days || 30;

                    // Calculate new expiration date (from NOW) for a manual set
                    const now = new Date();
                    now.setDate(now.getDate() + duration);
                    newExpiresAt = now;
                    shouldCreateSubscription = true;
                    log(`[Admin] New expiration date calculated: ${newExpiresAt}`);
                } else {
                    log(`[Admin] WARNING: Plan "${plan}" not found in database!`);
                }
            }
        } else {
            // Keep existing expiration if plan hasn't changed
            newExpiresAt = currentUser[0]?.plan_expires_at;
            log(`[Admin] Keeping existing expiration: ${newExpiresAt}`);
        }

        log(`[Admin] Final values - Plan: ${plan}, Expires: ${newExpiresAt}, CreateSub: ${shouldCreateSubscription}`);

        // Update User
        await connection.execute(`
            UPDATE users 
            SET full_name = ?, email = ?, role = ?, plan = ?, plan_expires_at = ?, status = ?, balance = ?
            WHERE id = ?
        `, [
            name,
            email,
            role,
            plan,
            newExpiresAt,
            status,
            balance || 0.00,
            id
        ]);

        // Create subscription record if needed
        if (shouldCreateSubscription && planId) {
            log('[Admin] Creating subscription record...');
            await connection.execute(`
                INSERT INTO user_subscriptions (user_id, plan_id, amount, start_date, end_date, status)
                VALUES (?, ?, 0, NOW(), ?, 'active')
            `, [id, planId, newExpiresAt]);
        }

        await connection.commit();
        log('[Admin] Transaction committed.');
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Update user error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// DELETE /api/admin/users/:id (Delete User)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        // Handle foreign key constraints (e.g. transactions, tickets)
        // For now, simple delete. In prod, maybe soft delete or cascade.
        res.status(500).json({ error: 'Failed to delete user. Check dependencies.' });
    }
});

// --- DASHBOARD STATS ---
router.get('/stats', async (req, res) => {
    try {
        const stats = {};

        // Total Users
        const [usersCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        stats.totalUsers = usersCount[0].count;

        // Revenue (Sum of 'deposit' or 'payment' type transactions)
        // Assuming 'deposit' is money in system, but maybe subscription purchases are tracked differently?
        // Let's sum 'amount' from user_subscriptions for actual subscription revenue, 
        // OR sum transactions where status='success' and type='deposit' for total money flow.
        // User asked for "Revenue". Let's sum successful generic deposits for now or subscription sales.
        // Best proxy for now: Sum of all successful transactions of type 'deposit' or 'subscription' (if we add that type).
        // The current payment logic uses 'deposit'.
        // Revenue: Sum of successful deposits AND subscriptions
        const [revenueRes] = await db.execute("SELECT SUM(amount) as total FROM transactions WHERE status='success' AND (type='deposit' OR type='subscription')");
        stats.revenue = revenueRes[0].total || 0;

        // Active Posts (News + Predictions + Insights)
        const [news] = await db.execute('SELECT COUNT(*) as count FROM news');
        const [preds] = await db.execute('SELECT COUNT(*) as count FROM predictions');
        const [insights] = await db.execute('SELECT COUNT(*) as count FROM match_insights');
        stats.activePosts = news[0].count + preds[0].count + insights[0].count;

        // Split Tickets (Total generated tickets)
        // Assuming 'split_tickets' table exists from previous task
        const [tickets] = await db.execute('SELECT COUNT(*) as count FROM split_tickets');
        stats.splitTickets = tickets[0].count;

        // Recent Activity (Mix of new users and transactions)
        // Let's just return recent transactions for now as "Activity"
        const [recent] = await db.execute(`
            (SELECT t.id, u.full_name as user, t.type as action, t.created_at as time 
             FROM transactions t
             JOIN users u ON t.user_id = u.id)
            UNION
            (SELECT id, full_name as user, 'Registered' as action, created_at as time
             FROM users)
            ORDER BY time DESC
            LIMIT 5
        `);
        stats.recentActivity = recent.map(r => ({
            id: r.id,
            user: r.user,
            action: r.action, // e.g. "deposit", "withdrawal"
            time: r.time // Frontend handles mapping to "x mins ago"
        }));

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GLOBAL TRANSACTIONS ---
router.get('/transactions', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.*, u.full_name as user_name 
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve Transaction (Withdrawal)
router.post('/transactions/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("UPDATE transactions SET status='success' WHERE id=? AND type='withdrawal'", [id]);
        // In a real system, this would trigger the Payout API (e.g. Paystack Transfer)
        res.json({ message: 'Withdrawal Approved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reject Transaction (Withdrawal)
router.post('/transactions/:id/reject', async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Get transaction to verify it is pending and get amount
        const [txs] = await connection.execute("SELECT amount, user_id, status FROM transactions WHERE id = ? FOR UPDATE", [id]);

        if (txs.length === 0) throw new Error('Transaction not found');
        const tx = txs[0];

        if (tx.status !== 'pending') throw new Error('Transaction is not pending');

        // Refund User Balance
        await connection.execute("UPDATE users SET balance = balance + ? WHERE id = ?", [tx.amount, tx.user_id]);

        // Update Status
        await connection.execute("UPDATE transactions SET status = 'failed', description = CONCAT(COALESCE(description, ''), ' [Rejected]') WHERE id = ?", [id]);

        await connection.commit();
        res.json({ message: 'Withdrawal Rejected and Refunded' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

// --- PLANS MANAGEMENT ---
router.get('/plans', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM subscription_plans');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/plans', async (req, res) => {
    const { name, price, duration_days, description } = req.body;
    try {
        await db.execute(
            'INSERT INTO subscription_plans (name, price, duration_days, description) VALUES (?, ?, ?, ?)',
            [name, price, duration_days, description]
        );
        res.json({ message: 'Plan created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/plans/:id', async (req, res) => {
    const { name, price, duration_days, description } = req.body;
    try {
        await db.execute(
            'UPDATE subscription_plans SET name=?, price=?, duration_days=?, description=? WHERE id=?',
            [name, price, duration_days, description, req.params.id]
        );
        res.json({ message: 'Plan updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/plans/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM subscription_plans WHERE id=?', [req.params.id]);
        res.json({ message: 'Plan deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
