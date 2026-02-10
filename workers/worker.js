import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPath = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootPath, ".env") });

import { Worker } from "bullmq";
import { sendEmail } from "../utils/email.js";
import { sendPushNotification } from "../utils/notifications.js";
import prisma from "../prisma/client.js";

// Connection for BullMQ
const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null
};

console.log(`[Worker] Started. 
  REDIS_HOST: ${process.env.REDIS_HOST || "DEFAULT (127.0.0.1)"}
  REDIS_PORT: ${process.env.REDIS_PORT || "DEFAULT (6379)"}
  EMAIL_HOST: ${process.env.EMAIL_HOST ? "PRESENT" : "MISSING"}
  DATABASE_URL: ${process.env.DATABASE_URL ? "PRESENT" : "MISSING"}
`);

// 1. Email Worker
const emailWorker = new Worker("emailQueue", async (job) => {
    const { email, subject, html, ticketId, type: _type } = job.data;
    console.info(`[Worker] Processing Email to: ${email} ${ticketId ? `for Ticket: ${ticketId}` : ""}`);
    
    try {
        await sendEmail(email, subject, html);
        
        // If it's a support ticket, mark as notified
        if (ticketId) {
            await prisma.supportTicket.update({
                where: { id: ticketId },
                data: { 
                    adminNotified: true,
                    notificationError: null 
                }
            });
        }
    } catch (error) {
        // If it's a support ticket, log the error but let BullMQ retry
        if (ticketId) {
            await prisma.supportTicket.update({
                where: { id: ticketId },
                data: { 
                    notificationError: `Attempt failed: ${error.message}`
                }
            });
        }
        throw error; // Rethrow to trigger BullMQ retry
    }
}, { connection, concurrency: 5 });

// 2. Notification Worker
const notificationWorker = new Worker("notificationQueue", async (job) => {
    const { userId, payload } = job.data;
    console.info(`[Worker] Processing Push Notification for User: ${userId}`);
    await sendPushNotification(userId, payload);
}, { connection, concurrency: 10 });

emailWorker.on("completed", (job) => console.info(`[Worker] Email Job ${job.id} completed`));
emailWorker.on("failed", async (job, err) => {
    console.error(`[Worker] Email Job ${job.id} failed:`, err.message);
    
    // If all retries exhausted, mark as definitively failed
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
        const { ticketId } = job.data;
        if (ticketId) {
            await prisma.supportTicket.update({
                where: { id: ticketId },
                data: { 
                    notificationError: `Final failure after ${job.attemptsMade} attempts: ${err.message}`
                }
            });
        }
    }
});

notificationWorker.on("completed", (job) => console.info(`[Worker] Notification Job ${job.id} completed`));
notificationWorker.on("failed", (job, err) => console.error(`[Worker] Notification Job ${job.id} failed:`, err.message));

console.info("🚀 Background Workers are running and listening for jobs...");
