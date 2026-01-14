import express from 'express';
import db from '../db.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
import { authenticateToken } from '../middleware/auth.js';

// Get Subscription Plans
router.get('/plans', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM subscription_plans ORDER BY price ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

// Charge Balance
router.post('/charge', authenticateToken, async (req, res) => {
    const { amount, description } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // 1. Check Balance
        const [users] = await connection.execute('SELECT balance FROM users WHERE id = ? FOR UPDATE', [userId]);
        if (users.length === 0) throw new Error('User not found');

        const currentBalance = parseFloat(users[0].balance);
        if (currentBalance < amount) {
            await connection.rollback();
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // 2. Deduct Balance
        await connection.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

        // 3. Log Transaction
        await connection.execute(
            'INSERT INTO transactions (user_id, amount, reference, status, type) VALUES (?, ?, ?, ?, ?)',
            [userId, amount, `CHG_${Date.now()}_${Math.random().toString(36).substring(7)}`, 'success', 'withdrawal']
        );

        await connection.commit();
        res.json({ message: 'Charge successful', newBalance: currentBalance - amount });
    } catch (error) {
        await connection.rollback();
        console.error('Charge Error:', error);
        res.status(500).json({ error: 'Failed to process charge' });
    } finally {
        connection.release();
    }
});



// Initialize Payment
router.post('/initialize', authenticateToken, async (req, res) => {
    const { amount, email } = req.body;

    try {
        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email,
            amount: amount * 100, // Convert to kobo

            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback` // Frontend Callback Route
        }, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Paystack Init Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

// Verify Payment
router.post('/verify', authenticateToken, async (req, res) => {
    const { reference } = req.body;
    const userId = req.user.id;

    try {
        // Check if already processed
        const [existing] = await db.execute('SELECT * FROM transactions WHERE reference = ?', [reference]);
        if (existing.length > 0) {
            return res.json({ message: 'Transaction already processed', status: existing[0].status });
        }

        // Verify with Paystack
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        });

        const data = response.data.data;

        if (data.status === 'success') {
            const amount = data.amount / 100;

            // Start transaction
            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                // 1. Log transaction
                await connection.execute(
                    'INSERT INTO transactions (user_id, amount, reference, status, type) VALUES (?, ?, ?, ?, ?)',
                    [userId, amount, reference, 'success', 'deposit']
                );

                // 2. Update user balance
                await connection.execute(
                    'UPDATE users SET balance = balance + ? WHERE id = ?',
                    [amount, userId]
                );

                await connection.commit();
                res.json({ message: 'Payment successful', amount: amount });
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        } else {
            res.status(400).json({ error: 'Transaction failed or pending' });
        }

    } catch (error) {
        console.error('Verify Payment Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Verify Subscription Payment
router.post('/verify-subscription', authenticateToken, async (req, res) => {
    const { reference, planId } = req.body;
    const userId = req.user.id;

    try {
        // Prevent duplicate processing
        const [existing] = await db.execute('SELECT * FROM user_subscriptions WHERE status = ? AND id IN (SELECT id FROM transactions WHERE reference = ?)', ['active', reference]);
        // Actually, better to check transactions table for reference uniqueness first
        const [txExists] = await db.execute('SELECT * FROM transactions WHERE reference = ?', [reference]);
        if (txExists.length > 0) return res.json({ message: 'Transaction already processed' });

        // Verify with Paystack
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        });

        const data = response.data.data;
        if (data.status === 'success') {
            const amount = data.amount / 100;

            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                // 1. Get Plan details
                const [plans] = await connection.execute('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
                if (plans.length === 0) throw new Error('Invalid plan');
                const plan = plans[0];

                if (parseFloat(amount) < parseFloat(plan.price)) {
                    throw new Error('Payment amount mismatch');
                }

                // 2. Log transaction
                await connection.execute(
                    'INSERT INTO transactions (user_id, amount, reference, status, type) VALUES (?, ?, ?, ?, ?)',
                    [userId, amount, reference, 'success', 'subscription']
                );

                // 3. Calculate expiry
                const now = new Date();
                const expiry = new Date(now.setDate(now.getDate() + plan.duration_days));

                // 4. Update User Plan
                await connection.execute(
                    'UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?',
                    [plan.name, expiry, userId]
                );

                // 5. Log Subscription History
                const [subResult] = await connection.execute(
                    'INSERT INTO user_subscriptions (user_id, plan_id, amount, end_date, status) VALUES (?, ?, ?, ?, ?)',
                    [userId, planId, amount, expiry, 'active']
                );

                // 6. Referral Commission
                try {
                    const [referrerRows] = await connection.execute('SELECT referrer_id FROM users WHERE id = ?', [userId]);
                    const referrerId = referrerRows[0]?.referrer_id;

                    if (referrerId) {
                        // Get Rate (Default 5%)
                        const [settings] = await connection.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'referral_percentage'");
                        const rate = settings.length > 0 ? parseFloat(settings[0].setting_value) : 5;

                        const commission = (amount * rate) / 100;

                        if (commission > 0) {
                            // Credit Referrer
                            await connection.execute('UPDATE users SET balance = balance + ? WHERE id = ?', [commission, referrerId]);
                            // Log Earnings
                            await connection.execute(
                                'INSERT INTO referral_earnings (referrer_id, referred_user_id, subscription_id, amount, status) VALUES (?, ?, ?, ?, ?)',
                                [referrerId, userId, subResult.insertId, commission, 'paid']
                            );
                        }
                    }
                } catch (refError) {
                    console.error('Referral Commission Error (Non-fatal):', refError);
                    // Swallow error so subscription doesn't fail
                }

                await connection.commit();
                res.json({ message: 'Subscription successful', plan: plan.name, expires: expiry });
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        } else {
            res.status(400).json({ error: 'Payment failed' });
        }
    } catch (error) {
        console.error('Verify Sub Error:', error);
        res.status(500).json({ error: 'Subscription verification failed' });
    }
});
// Get Transaction History
router.get('/history', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        // Use db.query instead of db.execute for LIMIT/OFFSET compatibility
        const [rows] = await db.query(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, parseInt(limit), parseInt(offset)]
        );

        // Get total count for pagination
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
            [userId]
        );

        res.json({
            data: rows,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult[0].total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Request Withdrawal
router.post('/withdraw', authenticateToken, async (req, res) => {
    const { amount, bankDetails } = req.body; // bankDetails: { bankName, accountNumber, accountName }
    const userId = req.user.id;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!bankDetails) return res.status(400).json({ error: 'Bank details required' });

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Check Balance
        const [users] = await connection.execute('SELECT balance FROM users WHERE id = ? FOR UPDATE', [userId]);
        const currentBalance = parseFloat(users[0].balance || 0);

        if (currentBalance < amount) {
            throw new Error('Insufficient balance');
        }

        // Deduct Balance (Encumber funds)
        await connection.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

        // Log Transaction (Pending)
        const ref = `WDR_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
        await connection.execute(
            'INSERT INTO transactions (user_id, amount, reference, status, type, bank_details, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                userId,
                amount,
                ref,
                'pending',
                'withdrawal',
                JSON.stringify(bankDetails),
                'Withdrawal Request'
            ]
        );

        await connection.commit();
        res.json({ message: 'Withdrawal request submitted for approval.', newBalance: currentBalance - amount });

    } catch (err) {
        await connection.rollback();
        console.error('Withdrawal Error:', err);
        res.status(400).json({ error: err.message || 'Withdrawal failed' });
    } finally {
        connection.release();
    }
});

// Paystack Webhook
router.post('/webhook', async (req, res) => {
    // Validate Signature
    try {
        const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(400).send('Invalid signature');
        }
    } catch (e) {
        return res.status(400).send('Signature validation failed');
    }

    // Acknowledge receipt immediately (Paystack expects 200 fast)
    res.sendStatus(200);

    const event = req.body;

    // Process "charge.success"
    if (event.event === 'charge.success') {
        const data = event.data;
        const reference = data.reference;
        const amount = data.amount / 100;
        const email = data.customer.email;

        try {
            // Check if already processed
            const [existing] = await db.execute('SELECT * FROM transactions WHERE reference = ?', [reference]);
            if (existing.length > 0) return; // Already done

            // Find User
            const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                console.error('Webhook: User not found for email', email);
                return;
            }
            const userId = users[0].id;

            const connection = await db.getConnection();
            await connection.beginTransaction();

            try {
                // Log transaction
                await connection.execute(
                    'INSERT INTO transactions (user_id, amount, reference, status, type) VALUES (?, ?, ?, ?, ?)',
                    [userId, amount, reference, 'success', 'deposit']
                );

                // Update user balance
                await connection.execute(
                    'UPDATE users SET balance = balance + ? WHERE id = ?',
                    [amount, userId]
                );

                await connection.commit();
                console.log(`Webhook: Processed deposit ${reference}`);
            } catch (err) {
                await connection.rollback();
                console.error('Webhook processing error:', err);
            } finally {
                connection.release();
            }
        } catch (dbErr) {
            console.error('Webhook DB Error:', dbErr);
        }
    }
});

export default router;
