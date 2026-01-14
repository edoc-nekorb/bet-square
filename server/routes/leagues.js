import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all leagues
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM leagues';
        let params = [];

        if (search) {
            query += ' WHERE name LIKE ?';
            params.push(`%${search}%`);
        }

        query += ' ORDER BY name ASC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create league (Admin only typically, using authenticateToken)
router.post('/', authenticateToken, async (req, res) => {
    const { name, logo } = req.body;
    try {
        await db.query('INSERT INTO leagues (name, logo) VALUES (?, ?)', [name, logo]);
        res.json({ message: 'League created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update league
router.put('/:id', authenticateToken, async (req, res) => {
    const { name, logo } = req.body;
    try {
        await db.query('UPDATE leagues SET name=?, logo=? WHERE id=?', [name, logo, req.params.id]);
        res.json({ message: 'League updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete league
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Optional: Check usage in predictions or handle constraint error
        await db.query('DELETE FROM leagues WHERE id=?', [req.params.id]);
        res.json({ message: 'League deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
