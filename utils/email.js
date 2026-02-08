import nodemailer from "nodemailer";

/**
 * Create reusable transporter object using AhaSend SMTP
 * Based on: https://ahasend.com/docs/smtp/nodejs
 */
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // 'send.ahasend.com'
    port: 587,
    requireTLS: true, // Force TLS (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Utility to send emails via AhaSend
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email body in HTML
 */
export const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
        console.log("Message ID:", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error.message);
        throw error;
    }
};
