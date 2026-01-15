import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { isAllowedEmailDomain, generateOTP, sendVerificationEmail, sendDeletionRequestEmail, sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Reserved usernames that cannot be registered
const RESERVED_USERNAMES = [
    'admin', 'administrator', 'support', 'help', 'system', 'root',
    'moderator', 'mod', 'staff', 'official', 'betsquare', 'bet_square',
    'api', 'www', 'mail', 'email', 'test', 'demo', 'user', 'null', 'undefined'
];

// Validate username format (alphanumeric + underscore, 4-20 chars)
const isValidUsername = (username) => {
    return /^[a-zA-Z0-9_]{4,20}$/.test(username);
};

// Check if username is reserved
const isReservedUsername = (username) => {
    return RESERVED_USERNAMES.includes(username.toLowerCase());
};


// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        // Check if email is verified
        if (!user.email_verified) {
            // Generate new OTP and send it
            const otp = generateOTP();
            const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await db.execute(
                'UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?',
                [otp, expires, user.id]
            );

            try {
                await sendVerificationEmail(user.email, otp, user.username || user.full_name);
            } catch (emailError) {
                console.error('Failed to send OTP on login:', emailError);
            }

            return res.status(403).json({
                error: 'Email not verified',
                requiresVerification: true,
                email: user.email
            });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                username: user.username,
                email_verified: user.email_verified
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to generate referral code
import crypto from 'crypto';
const generateRefCode = () => 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase();

// SIGNUP
router.post('/signup', async (req, res) => {
    const { email, password, firstName, lastName, username, referralCode } = req.body;

    try {
        // 1. Validate email domain
        if (!isAllowedEmailDomain(email)) {
            return res.status(400).json({
                error: 'Please use a valid email from Gmail, Yahoo, Hotmail, Outlook, or iCloud.'
            });
        }

        // 2. Validate username
        if (!username || !isValidUsername(username)) {
            return res.status(400).json({
                error: 'Username must be 4-20 characters and only contain letters, numbers, and underscores.'
            });
        }

        // 3. Check if username is reserved
        if (isReservedUsername(username)) {
            return res.status(400).json({
                error: 'This username is reserved and cannot be used.'
            });
        }

        // 3. Check if email already exists
        const [existingEmail] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // 4. Check if username already exists
        const [existingUsername] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsername.length > 0) {
            return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
        }

        // 5. Handle Referral Code (Lookup Referrer)
        let referrerId = null;
        if (referralCode) {
            const [referrers] = await db.execute('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
            if (referrers.length > 0) {
                referrerId = referrers[0].id;
            }
            // If invalid code, we just ignore it (standard practice to avoid friction)
        }

        // 6. Generate Referral Code for New User
        // Simple collision handling: try once, if fails, user can try again (rare) or duplicate key error is caught.
        // For robustness, usually loop, but collision probability of 6 hex chars (16^6 = 16M) is low for MVP.
        const newReferralCode = generateRefCode();

        // 7. Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = `${firstName} ${lastName}`;
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const [result] = await db.execute(
            'INSERT INTO users (email, password, full_name, username, role, email_verified, verification_code, verification_expires, referrer_id, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, fullName, username, 'user', false, otp, otpExpires, referrerId, newReferralCode]
        );

        // 8. Send verification email
        try {
            await sendVerificationEmail(email, otp, username);
        } catch (emailError) {
            // Delete user if email fails to avoid orphaned unverified accounts
            await db.execute('DELETE FROM users WHERE id = ?', [result.insertId]);
            return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
        }

        res.json({
            message: 'Account created! Please check your email for the verification code.',
            requiresVerification: true,
            email: email
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: err.message });
    }
});

// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ? AND verification_code = ?',
            [email, otp]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        const user = users[0];

        // Check if OTP expired
        if (new Date() > new Date(user.verification_expires)) {
            return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
        }

        // Mark as verified
        await db.execute(
            'UPDATE users SET email_verified = TRUE, verification_code = NULL, verification_expires = NULL WHERE id = ?',
            [user.id]
        );

        res.json({ message: 'Email verified successfully! You can now login.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// RESEND OTP
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;

    try {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'No account found with this email.' });
        }

        const user = users[0];

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email is already verified.' });
        }

        const otp = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000);

        await db.execute(
            'UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?',
            [otp, expires, user.id]
        );

        await sendVerificationEmail(email, otp, user.username || user.full_name);

        res.json({ message: 'New verification code sent to your email.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ME (For Admin Check)
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await db.execute(
            'SELECT id, email, role, full_name, username, balance, plan, plan_expires_at, email_verified, referral_code, deletion_requested_at FROM users WHERE id = ?',
            [decoded.id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        res.json(users[0]);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Referral Stats
router.get('/referral-stats', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        // Count Referred
        const [refUsers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE referrer_id = ?', [userId]);

        // Sum Earnings
        const [earnings] = await db.execute('SELECT SUM(amount) as total FROM referral_earnings WHERE referrer_id = ?', [userId]);

        res.json({
            referredCount: refUsers[0].count,
            totalEarnings: parseFloat(earnings[0].total || 0)
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            // Security: Don't reveal user existence
            return res.json({ message: 'If an account exists, a reset link has been sent.' });
        }
        const user = users[0];

        // Generate Reset Token (JWT short-lived)
        const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });

        await sendPasswordResetEmail(user.email, resetToken, user.username || user.full_name);

        res.json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'reset') throw new Error('Invalid token type');

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, decoded.id]);

        res.json({ message: 'Password reset successfully. You can now login.' });
    } catch (err) {
        res.status(400).json({ error: 'Invalid or expired reset link' });
    }
});

// CHANGE PASSWORD
router.post('/change-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = users[0];

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(400).json({ error: 'Incorrect current password' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// REQUEST DELETION
router.post('/request-deletion', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [decoded.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = users[0];

        // 1. Mark as requested
        await db.execute('UPDATE users SET deletion_requested_at = NOW() WHERE id = ?', [user.id]);

        // 2. Notify Admin (DB Notification)
        await db.execute(
            'INSERT INTO admin_notifications (type, user_id, message) VALUES (?, ?, ?)',
            ['deletion_request', user.id, `User ${user.full_name} (${user.email}) has requested account deletion.`]
        );

        // 3. Email User
        sendDeletionRequestEmail(user.email, user.username || user.full_name);

        res.json({ message: 'Deletion requested successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CANCEL DELETION
router.post('/cancel-deletion', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // 1. Clear request
        await db.execute('UPDATE users SET deletion_requested_at = NULL WHERE id = ?', [decoded.id]);

        // 2. Remove notification (Optional cleanup)
        await db.execute("DELETE FROM admin_notifications WHERE user_id = ? AND type = 'deletion_request'", [decoded.id]);

        res.json({ message: 'Deletion request cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
