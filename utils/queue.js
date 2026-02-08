import { Queue } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379
};

// Queue Definitions
export const emailQueue = new Queue("emailQueue", { connection });
export const notificationQueue = new Queue("notificationQueue", { connection });

console.info("BullMQ Queues initialized successfully");
