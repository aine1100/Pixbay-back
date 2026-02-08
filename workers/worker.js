import { Worker } from "bullmq";
import dotenv from "dotenv";
import { sendEmail } from "../utils/email.js";
import { sendPushNotification } from "../utils/notifications.js";

dotenv.config();

const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379
};

// 1. Email Worker
const emailWorker = new Worker("emailQueue", async (job) => {
    const { email, subject, html } = job.data;
    console.info(`[Worker] Processing Email to: ${email}`);
    await sendEmail(email, subject, html);
}, { connection, concurrency: 5 });

// 2. Notification Worker
const notificationWorker = new Worker("notificationQueue", async (job) => {
    const { userId, payload } = job.data;
    console.info(`[Worker] Processing Push Notification for User: ${userId}`);
    await sendPushNotification(userId, payload);
}, { connection, concurrency: 10 });

emailWorker.on("completed", (job) => console.info(`[Worker] Email Job ${job.id} completed`));
emailWorker.on("failed", (job, err) => console.error(`[Worker] Email Job ${job.id} failed:`, err.message));

notificationWorker.on("completed", (job) => console.info(`[Worker] Notification Job ${job.id} completed`));
notificationWorker.on("failed", (job, err) => console.error(`[Worker] Notification Job ${job.id} failed:`, err.message));

console.info("🚀 Background Workers are running and listening for jobs...");
