import nodemailer from "nodemailer";
import { createBreaker } from "./circuitBreaker.js";

/**
 * Create reusable transporter object using SMTP
 */
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Utility to send emails
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email body in HTML
 */
const _sendEmail = async (to, subject, html) => {
    console.log(`[Email Service] Attempting to send email to: ${to}`);
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
};

const emailBreaker = createBreaker(_sendEmail, "Email Service (SMTP)");

export const sendEmail = (to, subject, html) => emailBreaker.fire(to, subject, html);
