import express from 'express';
const router = express.Router();
import db from '../db.js';

// Get all clubs (for autocomplete)
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM clubs ORDER BY name ASC';
        let params = [];

        if (search) {
            query = 'SELECT * FROM clubs WHERE name LIKE ? OR short_name LIKE ? ORDER BY name ASC';
            params = [`%${search}%`, `%${search}%`];
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new club
router.post('/', async (req, res) => {
    const { name, short_name, logo } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO clubs (name, short_name, logo) VALUES (?, ?, ?)',
            [name, short_name, logo]
        );
        res.json({ message: 'Club created', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update club
router.put('/:id', async (req, res) => {
    const { name, short_name, logo } = req.body;
    try {
        await db.execute(
            'UPDATE clubs SET name=?, short_name=?, logo=? WHERE id=?',
            [name, short_name, logo, req.params.id]
        );
        res.json({ message: 'Club updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete club
router.delete('/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM clubs WHERE id=?', [req.params.id]);
        res.json({ message: 'Club deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
