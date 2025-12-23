import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { isAllowedEmailDomain, generateOTP, sendVerificationEmail } from '../services/email.js';

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

// SIGNUP
router.post('/signup', async (req, res) => {
    const { email, password, firstName, lastName, username } = req.body;

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

        // 5. Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const fullName = `${firstName} ${lastName}`;
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const [result] = await db.execute(
            'INSERT INTO users (email, password, full_name, username, role, email_verified, verification_code, verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, fullName, username, 'user', false, otp, otpExpires]
        );

        // 6. Send verification email
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
            'SELECT id, email, role, full_name, username, balance, plan, plan_expires_at, email_verified FROM users WHERE id = ?',
            [decoded.id]
        );
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        res.json(users[0]);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

export default router;
