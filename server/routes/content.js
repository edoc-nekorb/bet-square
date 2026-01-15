import express from 'express';
const router = express.Router();
import db from '../db.js';
import { sendToPremiumUsers } from '../services/push.js';

// --- NEWS ---
router.get('/news', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM news ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('[API] Validation/News Error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/news', async (req, res) => {
    const { title, source, status, image, body } = req.body;
    try {
        await db.execute('INSERT INTO news (title, source, status, image, body) VALUES (?, ?, ?, ?, ?)',
            [title, source, status, image, body]);
        res.json({ message: 'News added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/news/:id', async (req, res) => {
    const { title, source, status, image, body } = req.body;
    try {
        await db.execute('UPDATE news SET title=?, source=?, status=?, image=?, body=? WHERE id=?',
            [title, source, status, image, body, req.params.id]);
        res.json({ message: 'News updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/news/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM news WHERE id=?', [req.params.id]);
        res.json({ message: 'News deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

import { optionalAuth } from '../middleware/auth.js';

// --- PREDICTIONS ---
router.get('/predictions', optionalAuth, async (req, res) => {
    try {
        const { limit = 10, offset = 0, date } = req.query;

        let query = `
            SELECT 
                p.*,
                hc.name as home_club_name, hc.short_name as home_club_short, hc.logo as home_club_logo,
                ac.name as away_club_name, ac.short_name as away_club_short, ac.logo as away_club_logo,
                l.name as league_name, l.logo as league_logo
            FROM predictions p
            LEFT JOIN clubs hc ON p.home_club_id = hc.id
            LEFT JOIN clubs ac ON p.away_club_id = ac.id
            LEFT JOIN leagues l ON p.league_id = l.id
        `;

        let params = [];

        if (date) {
            query += ' WHERE DATE(p.match_date) = ?';
            params.push(date);
        }

        query += ' ORDER BY p.match_date DESC, p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(query, params);

        // Access Control Logic
        const isAdmin = req.user?.role === 'admin';
        const isPremium = req.user?.plan && req.user.plan !== 'free';
        const canViewAll = isAdmin || isPremium;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const maskedRows = rows.map((row, index) => {
            const matchDate = new Date(row.match_date);
            matchDate.setHours(0, 0, 0, 0);

            const isPast = matchDate < today;
            const globalIndex = parseInt(offset) + index;

            // 1. Past tips are free for everyone.
            // 2. Premium/Admin see everything.
            // 3. For Today/Future: First 2 tips are free (Teaser), rest locked.
            if (isPast || canViewAll || globalIndex < 2) {
                return { ...row, isLocked: false };
            }

            return {
                ...row,
                outcome: '***',
                odds: '***',
                confidence: '***',
                isLocked: true
            };
        });

        res.json(maskedRows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/predictions', async (req, res) => {
    const { home_club_id, away_club_id, outcome, odds, confidence, status, match_date, match_time, result_status, league_id } = req.body;
    try {
        await db.execute(
            'INSERT INTO predictions (home_club_id, away_club_id, match_name, outcome, odds, confidence, status, match_date, match_time, result_status, league_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [home_club_id, away_club_id, `${home_club_id} vs ${away_club_id}`, outcome, odds, confidence, status, match_date, match_time || '00:00:00', result_status || 'pending', league_id]
        );

        // Notify premium users about new prediction
        if (status === 'Published') {
            await sendToPremiumUsers({
                title: '🎯 New Prediction Available!',
                body: `Check out our latest betting tip`,
                url: '/dashboard',
                tag: 'prediction-new'
            });
        }

        res.json({ message: 'Prediction added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/predictions/:id', async (req, res) => {
    const { home_club_id, away_club_id, outcome, odds, confidence, status, match_date, match_time, result_status, league_id } = req.body;
    try {
        await db.execute(
            'UPDATE predictions SET home_club_id=?, away_club_id=?, match_name=?, outcome=?, odds=?, confidence=?, status=?, match_date=?, match_time=?, result_status=?, league_id=? WHERE id=?',
            [home_club_id, away_club_id, `${home_club_id} vs ${away_club_id}`, outcome, odds, confidence, status, match_date, match_time, result_status, league_id, req.params.id]
        );

        // Notify premium users about prediction result update
        if (result_status && result_status !== 'pending') {
            const resultEmoji = result_status === 'won' ? '✅' : '❌';
            await sendToPremiumUsers({
                title: `${resultEmoji} Prediction Result Updated`,
                body: `A prediction has been marked as ${result_status}`,
                url: '/dashboard',
                tag: 'prediction-result'
            });
        }

        res.json({ message: 'Prediction updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.delete('/predictions/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM predictions WHERE id=?', [req.params.id]);
        res.json({ message: 'Prediction deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- INSIGHTS ---
router.get('/insights', async (req, res) => {
    try {
        const query = `
            SELECT mi.*, 
                   hc.name as home_club_name, hc.logo as home_club_logo,
                   ac.name as away_club_name, ac.logo as away_club_logo
            FROM match_insights mi
            LEFT JOIN clubs hc ON mi.home_club_id = hc.id
            LEFT JOIN clubs ac ON mi.away_club_id = ac.id
            ORDER BY mi.created_at DESC
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/insights', async (req, res) => {
    const { title, source, image, excerpt, home_club_id, away_club_id } = req.body;
    try {
        await db.execute('INSERT INTO match_insights (title, source, image, excerpt, home_club_id, away_club_id) VALUES (?, ?, ?, ?, ?, ?)',
            [title, source, image, excerpt, home_club_id, away_club_id]);
        res.json({ message: 'Insight added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/insights/:id', async (req, res) => {
    const { title, source, image, excerpt, home_club_id, away_club_id } = req.body;
    try {
        await db.execute('UPDATE match_insights SET title=?, source=?, image=?, excerpt=?, home_club_id=?, away_club_id=? WHERE id=?',
            [title, source, image, excerpt, home_club_id, away_club_id, req.params.id]);
        res.json({ message: 'Insight updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/insights/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM match_insights WHERE id=?', [req.params.id]);
        res.json({ message: 'Insight deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REACTIONS ---
import { authenticateToken } from '../middleware/auth.js';

// Add or update reaction
router.post('/reactions', authenticateToken, async (req, res) => {
    const { postId, postType, reaction } = req.body;
    const userId = req.user.id;

    // Validate reaction type
    const validReactions = ['fire', 'sad', 'laugh', 'angry'];
    if (!validReactions.includes(reaction)) {
        return res.status(400).json({ error: 'Invalid reaction type' });
    }

    try {
        // Upsert: insert or update existing reaction
        await db.execute(`
            INSERT INTO post_reactions (user_id, post_id, post_type, reaction)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE reaction = ?
        `, [userId, postId, postType || 'news', reaction, reaction]);

        res.json({ message: 'Reaction added', reaction });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove reaction
router.delete('/reactions/:postId', authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const { postType } = req.query;
    const userId = req.user.id;

    try {
        await db.execute(
            'DELETE FROM post_reactions WHERE user_id = ? AND post_id = ? AND post_type = ?',
            [userId, postId, postType || 'news']
        );
        res.json({ message: 'Reaction removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get reactions for a post
router.get('/reactions/:postId', async (req, res) => {
    const { postId } = req.params;
    const { postType } = req.query;

    try {
        // Get counts by reaction type
        const [counts] = await db.execute(`
            SELECT reaction, COUNT(*) as count
            FROM post_reactions
            WHERE post_id = ? AND post_type = ?
            GROUP BY reaction
        `, [postId, postType || 'news']);

        // Format as { fire: 5, sad: 2, laugh: 10, angry: 1 }
        const reactionCounts = {
            fire: 0,
            sad: 0,
            laugh: 0,
            angry: 0
        };

        counts.forEach(row => {
            reactionCounts[row.reaction] = row.count;
        });

        res.json(reactionCounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's reaction for a post
router.get('/reactions/:postId/user', authenticateToken, async (req, res) => {
    const { postId } = req.params;
    const { postType } = req.query;
    const userId = req.user.id;

    try {
        const [rows] = await db.execute(
            'SELECT reaction FROM post_reactions WHERE user_id = ? AND post_id = ? AND post_type = ?',
            [userId, postId, postType || 'news']
        );

        res.json({ reaction: rows.length > 0 ? rows[0].reaction : null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get reactions for multiple posts (batch)
router.post('/reactions/batch', async (req, res) => {
    const { postIds, postType } = req.body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return res.json({});
    }

    try {
        const placeholders = postIds.map(() => '?').join(',');
        const [counts] = await db.execute(`
            SELECT post_id, reaction, COUNT(*) as count
            FROM post_reactions
            WHERE post_id IN (${placeholders}) AND post_type = ?
            GROUP BY post_id, reaction
        `, [...postIds, postType || 'news']);

        // Format as { postId: { fire: 5, sad: 2, ... }, ... }
        const result = {};
        postIds.forEach(id => {
            result[id] = { fire: 0, sad: 0, laugh: 0, angry: 0 };
        });

        counts.forEach(row => {
            if (result[row.post_id]) {
                result[row.post_id][row.reaction] = row.count;
            }
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

