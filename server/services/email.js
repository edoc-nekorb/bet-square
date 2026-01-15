import nodemailer from 'nodemailer';

// Email service for sending verification codes
// Uses configurable SMTP - set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Allowed email domains
const ALLOWED_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];


/**
 * Check if email domain is allowed
 */
export const isAllowedEmailDomain = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
};

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification OTP email
 */
export const sendVerificationEmail = async (email, otp, username) => {
    const mailOptions = {
        from: `"Bet Square" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Bet Square Account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #22c55e; margin: 0;">Bet Square</h1>
                    <p style="color: #666;">Your Smart Betting Partner</p>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; text-align: center;">
                    <h2 style="color: #333; margin-bottom: 10px;">Hey ${username}! 👋</h2>
                    <p style="color: #666; margin-bottom: 25px;">
                        Welcome to Bet Square! Use this OTP to verify your email address:
                    </p>
                    
                    <div style="background: #18181b; color: #22c55e; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        ${otp}
                    </div>
                    
                    <p style="color: #999; font-size: 14px; margin-top: 25px;">
                        This code expires in 10 minutes.<br>
                        If you didn't create an account, please ignore this email.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                    <p>© ${new Date().getFullYear()} Bet Square. All rights reserved.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Verification email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] Failed to send verification email:', error.message);
        throw new Error('Failed to send verification email. Please try again.');
    }
};

/**
 * Send deletion request confirmation email
 */
export const sendDeletionRequestEmail = async (email, username) => {
    const mailOptions = {
        from: `"Bet Square" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Account Deletion Requested',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #dc2626; margin: 0;">Deletion Requested</h1>
                </div>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; text-align: center;">
                    <h2 style="color: #333; margin-bottom: 10px;">Hello ${username},</h2>
                    <p style="color: #666; margin-bottom: 25px;">
                        We received a request to permanently delete your Bet Square account.
                    </p>
                    <p style="color: #666;">
                        Your account is now pending deletion. An admin will review this request shortly.
                        If you changed your mind, you can cancel this request from your profile settings.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                    <p>© ${new Date().getFullYear()} Bet Square.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Deletion email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] Failed to send deletion email:', error.message);
        // Don't throw, just log.
        return false;
    }
};

export default {
    isAllowedEmailDomain,
    generateOTP,
    sendVerificationEmail,
    sendDeletionRequestEmail
};
