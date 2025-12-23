import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.sendStatus(403);

        try {
            const [users] = await db.execute('SELECT id, role, plan, plan_expires_at, email, full_name, balance FROM users WHERE id = ?', [decoded.id]);
            if (users.length === 0) return res.sendStatus(403);

            req.user = users[0];

            // Check expiry
            if (req.user.plan !== 'free' && req.user.plan_expires_at) {
                if (new Date(req.user.plan_expires_at) < new Date()) {
                    await db.execute("UPDATE users SET plan='free', plan_expires_at=NULL WHERE id=?", [req.user.id]);
                    req.user.plan = 'free';
                }
            }

            next();
        } catch (dbErr) {
            console.error('Auth DB Error:', dbErr);
            res.sendStatus(500);
        }
    });
};

export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            req.user = null;
            return next();
        }

        try {
            const [users] = await db.execute('SELECT id, role, plan, plan_expires_at FROM users WHERE id = ?', [decoded.id]);
            if (users.length > 0) {
                req.user = users[0];
                // Check expiry logic same as above
                if (req.user.plan !== 'free' && req.user.plan_expires_at) {
                    if (new Date(req.user.plan_expires_at) < new Date()) {
                        await db.execute("UPDATE users SET plan='free', plan_expires_at=NULL WHERE id=?", [req.user.id]);
                        req.user.plan = 'free';
                    }
                }
            } else {
                req.user = null;
            }
        } catch (e) {
            req.user = null;
        }
        next();
    });
};

// Require admin role
export const requireAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
};
