import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("FATAL: REDIS_URL is not defined in the environment.");
    process.exit(1);
}

const redisClient = createClient({
    url: redisUrl
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.info("Connected to Redis successfully"));

// Auto-connect
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error("Failed to connect to Redis:", err.message);
    }
})();

export default redisClient;
