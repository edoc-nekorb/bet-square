import webpush from 'web-push';
import db from '../db.js';

// Configure VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@betsquare.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    console.log('[PUSH] VAPID keys configured');
} else {
    console.warn('[PUSH] VAPID keys not configured - push notifications disabled');
}

/**
 * Save a push subscription for a user
 */
export const saveSubscription = async (userId, subscription) => {
    const { endpoint, keys } = subscription;

    try {
        await db.execute(`
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE p256dh = ?, auth = ?
        `, [userId, endpoint, keys.p256dh, keys.auth, keys.p256dh, keys.auth]);

        console.log(`[PUSH] Subscription saved for user ${userId}`);
        return true;
    } catch (error) {
        console.error('[PUSH] Failed to save subscription:', error.message);
        throw error;
    }
};

/**
 * Remove a push subscription
 */
export const removeSubscription = async (userId, endpoint) => {
    try {
        await db.execute(
            'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
            [userId, endpoint]
        );
        console.log(`[PUSH] Subscription removed for user ${userId}`);
        return true;
    } catch (error) {
        console.error('[PUSH] Failed to remove subscription:', error.message);
        throw error;
    }
};

/**
 * Send push notification to a specific user
 */
export const sendToUser = async (userId, payload) => {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('[PUSH] VAPID keys not configured');
        return;
    }

    try {
        const [subscriptions] = await db.execute(
            'SELECT * FROM push_subscriptions WHERE user_id = ?',
            [userId]
        );

        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
                console.log(`[PUSH] Sent to user ${userId}`);
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired or invalid - remove it
                    await removeSubscription(userId, sub.endpoint);
                } else {
                    console.error('[PUSH] Send failed:', err.message);
                }
            }
        }
    } catch (error) {
        console.error('[PUSH] Error sending to user:', error.message);
    }
};

/**
 * Send push notification to all subscribed users
 */
export const sendToAll = async (payload) => {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('[PUSH] VAPID keys not configured');
        return;
    }

    try {
        const [subscriptions] = await db.execute('SELECT * FROM push_subscriptions');
        console.log(`[PUSH] Sending to ${subscriptions.length} subscriptions`);

        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await removeSubscription(sub.user_id, sub.endpoint);
                }
            }
        }

        console.log('[PUSH] Broadcast complete');
    } catch (error) {
        console.error('[PUSH] Broadcast error:', error.message);
    }
};

/**
 * Send push notification to premium users only
 */
export const sendToPremiumUsers = async (payload) => {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('[PUSH] VAPID keys not configured');
        return;
    }

    try {
        const [subscriptions] = await db.execute(`
            SELECT ps.*, u.plan 
            FROM push_subscriptions ps
            JOIN users u ON ps.user_id = u.id
            WHERE u.plan != 'free'
        `);

        console.log(`[PUSH] Sending to ${subscriptions.length} premium subscriptions`);

        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await removeSubscription(sub.user_id, sub.endpoint);
                }
            }
        }

        console.log('[PUSH] Premium broadcast complete');
    } catch (error) {
        console.error('[PUSH] Premium broadcast error:', error.message);
    }
};

// Export VAPID public key for frontend
export const getVapidPublicKey = () => vapidPublicKey;

export default {
    saveSubscription,
    removeSubscription,
    sendToUser,
    sendToAll,
    sendToPremiumUsers,
    getVapidPublicKey
};
