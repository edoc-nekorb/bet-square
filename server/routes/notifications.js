import express from 'express';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes
router.use(requireAdmin);

// GET Admin Notifications
router.get('/admin', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT an.*, u.full_name as user_name, u.email as user_email
            FROM admin_notifications an
            LEFT JOIN users u ON an.user_id = u.id
            ORDER BY an.is_read ASC, an.created_at DESC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark as Read
router.put('/:id/read', async (req, res) => {
    try {
        await db.execute('UPDATE admin_notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear All Read
router.delete('/clear-read', async (req, res) => {
    try {
        await db.execute('DELETE FROM admin_notifications WHERE is_read = TRUE');
        res.json({ message: 'Cleared read notifications' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
