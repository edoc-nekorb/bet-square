import express from 'express';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendToAll, sendToUser } from '../services/push.js';

const router = express.Router();

// Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    try {
        const [notifications] = await db.execute(`
            SELECT * FROM notifications 
            WHERE user_id = ? OR user_id IS NULL
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), parseInt(offset)]);

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const [result] = await db.execute(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE
        `, [userId]);

        res.json({ count: result[0].count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark all as read
router.patch('/read-all', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        await db.execute(`
            UPDATE notifications SET is_read = TRUE 
            WHERE user_id = ? OR user_id IS NULL
        `, [userId]);
        res.json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ====== ADMIN ROUTES ======

// Admin: Send broadcast notification (to all users)
router.post('/broadcast', requireAdmin, async (req, res) => {
    const { title, message, type = 'announcement', link } = req.body;

    if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
    }

    try {
        // user_id = NULL means broadcast to all users
        await db.execute(
            'INSERT INTO notifications (user_id, title, message, type, link) VALUES (NULL, ?, ?, ?, ?)',
            [title, message, type, link || null]
        );

        // Send push notification to all subscribed users
        await sendToAll({
            title,
            body: message,
            url: link || '/notifications',
            tag: 'broadcast'
        });

        res.json({ message: 'Notification sent to all users' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Send notification to specific user
router.post('/send', requireAdmin, async (req, res) => {
    const { userId, title, message, type = 'system', link } = req.body;

    if (!userId || !title || !message) {
        return res.status(400).json({ error: 'userId, title, and message are required' });
    }

    try {
        await db.execute(
            'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
            [userId, title, message, type, link || null]
        );

        // Send push notification to specific user
        await sendToUser(userId, {
            title,
            body: message,
            url: link || '/notifications',
            tag: 'personal'
        });

        res.json({ message: 'Notification sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Get all notifications (for management)
router.get('/all', requireAdmin, async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    try {
        const [notifications] = await db.execute(`
            SELECT n.*, u.email as user_email 
            FROM notifications n
            LEFT JOIN users u ON n.user_id = u.id
            ORDER BY n.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Delete notification
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        await db.execute('DELETE FROM notifications WHERE id = ?', [req.params.id]);
        res.json({ message: 'Notification deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
