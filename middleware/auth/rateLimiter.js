import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../../utils/redis.js";

/**
 * Global Rate Limiter - Applied to all routes
 * Limits everyone to 100 requests per 15 minutes
 */
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 100 requests per `window`
    standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    message: {
        status: 429,
        message: "Too many requests from this IP, please try again after 15 minutes."
    },
    validate: { default: false }, // Allow multiple limiters (e.g. Global + Auth)
});

/**
 * Strict Rate Limiter - Applied to Auth (Login, Register, OTP)
 * Limits to 100 attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    message: {
        status: 429,
        message: "Too many authentication attempts. Please try again after 15 minutes."
    },
    validate: { default: false }, // Allow multiple limiters
});
