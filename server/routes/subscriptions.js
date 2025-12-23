import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { saveSubscription, removeSubscription, getVapidPublicKey } from '../services/push.js';

const router = express.Router();

// Get VAPID public key (needed by frontend)
router.get('/vapid-key', (req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
        return res.status(500).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: key });
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ error: 'Invalid subscription data' });
    }

    try {
        await saveSubscription(userId, subscription);
        res.json({ message: 'Subscribed to push notifications' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
    }

    try {
        await removeSubscription(userId, endpoint);
        res.json({ message: 'Unsubscribed from push notifications' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
