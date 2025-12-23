import express from 'express';
import db from '../db.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
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
            callback_url: 'http://localhost:5173/payment/callback' // Frontend Callback Route
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
                await connection.execute(
                    'INSERT INTO user_subscriptions (user_id, plan_id, amount, end_date, status) VALUES (?, ?, ?, ?, ?)',
                    [userId, planId, amount, expiry, 'active']
                );

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
        const [rows] = await db.execute(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, parseInt(limit), parseInt(offset)]
        );

        // Get total count for pagination
        const [countResult] = await db.execute(
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

export default router;
