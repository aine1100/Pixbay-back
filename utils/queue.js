import { Queue } from "bullmq";
import dotenv from "dotenv";

dotenv.config();

const connection = {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT)
};

if (!connection.host || !connection.port) {
    console.error("FATAL: REDIS_HOST or REDIS_PORT is not defined in the environment.");
    process.exit(1);
}

// Queue Definitions
export const emailQueue = new Queue("emailQueue", { connection });
export const notificationQueue = new Queue("notificationQueue", { connection });

console.info("BullMQ Queues initialized successfully");
