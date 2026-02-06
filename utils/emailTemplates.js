/**
 * Reusable email templates for the Pixbay Marketplace
 */

const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 10px;
`;

const headerStyle = `
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
`;

const buttonStyle = `
    display: inline-block;
    padding: 12px 24px;
    background-color: #3498db;
    color: #ffffff;
    text-decoration: none;
    border-radius: 5px;
    font-weight: bold;
    margin-top: 20px;
`;

/**
 * Template for OTP Verification
 */
export const otpTemplate = (firstName, otp) => ({
    subject: "Verify your Pixbay Account",
    html: `
        <div style="${baseStyle}">
            <h1 style="${headerStyle}">Welcome to Pixbay, ${firstName}!</h1>
            <p>Thank you for joining our creative marketplace. To complete your registration, please use the following verification code:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #3498db;">
                ${otp}
            </div>
            <p>This code will expire in <strong>10 minutes</strong>. If you did not sign up for this account, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">&copy; 2026 Pixbay Marketplace. All rights reserved.</p>
        </div>
    `
});

/**
 * Template for Password Reset
 */
export const passwordResetTemplate = (firstName, resetURL) => ({
    subject: "Reset your Pixbay Password",
    html: `
        <div style="${baseStyle}">
            <h1 style="${headerStyle}">Password Reset Request</h1>
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to set a new one:</p>
            <div style="text-align: center;">
                <a href="${resetURL}" style="${buttonStyle}">Reset Password</a>
            </div>
            <p style="margin-top: 30px;">Alternatively, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #3498db; font-size: 14px;">${resetURL}</p>
            <p>This link will expire in 1 hour. If you did not request a password reset, No further action is required.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">&copy; 2026 Pixbay Marketplace. All rights reserved.</p>
        </div>
    `
});

/**
 * Template for Password Reset via OTP
 */
export const passwordResetOTPTemplate = (firstName, otp) => ({
    subject: "Your Password Reset Code - Pixbay",
    html: `
        <div style="${baseStyle}">
            <h1 style="${headerStyle}">Password Reset Request</h1>
            <p>Hello ${firstName},</p>
            <p>You requested to reset your password. Please use the 6-digit security code below to complete the process:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #e74c3c;">
                ${otp}
            </div>
            <p>This code will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email and ensure your account is secure.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">&copy; 2026 Pixbay Marketplace. All rights reserved.</p>
        </div>
    `
});
