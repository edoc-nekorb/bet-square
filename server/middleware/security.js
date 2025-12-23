import rateLimit from 'express-rate-limit';

// General API rate limiter: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict rate limiter for auth endpoints: 5 requests per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many login attempts, please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});

// Signup rate limiter: 3 accounts per hour per IP
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { error: 'Too many accounts created from this IP, please try again in an hour.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Block access to sensitive files
export const blockSensitiveFiles = (req, res, next) => {
    const blockedPaths = [
        '/.env',
        '/.git',
        '/package.json',
        '/package-lock.json',
        '/node_modules',
        '/server',
        '/.gitignore'
    ];

    const requestPath = req.path.toLowerCase();

    for (const blocked of blockedPaths) {
        if (requestPath.startsWith(blocked)) {
            return res.status(404).json({ error: 'Not found' });
        }
    }

    next();
};

// Basic input sanitization
export const sanitizeInput = (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key]
                    .replace(/[<>]/g, '') // Remove angle brackets
                    .trim();
            }
        });
    }

    // Sanitize body - remove script tags and dangerous patterns
    if (req.body && typeof req.body === 'object') {
        const sanitizeValue = (val) => {
            if (typeof val === 'string') {
                return val
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+=/gi, '')
                    .trim();
            }
            return val;
        };

        Object.keys(req.body).forEach(key => {
            req.body[key] = sanitizeValue(req.body[key]);
        });
    }

    next();
};

export default {
    generalLimiter,
    authLimiter,
    signupLimiter,
    blockSensitiveFiles,
    sanitizeInput
};
