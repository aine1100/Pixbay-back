import redisClient from "../../utils/redis.js";

/**
 * Cache middleware for Express
 * @param {number} ttl - Time to live in seconds (default 1 hour)
 */
export const cacheMiddleware = (ttl = 3600) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== "GET") return next();

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedData = await redisClient.get(key);
            if (cachedData) {
                console.info(`[Cache] Hit for ${key}`);
                return res.json(JSON.parse(cachedData));
            }

            console.info(`[Cache] Miss for ${key}`);

            // Patch res.json to cache the response before sending
            const originalJson = res.json;
            res.json = function (data) {
                res.json = originalJson; // restore original

                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redisClient.setEx(key, ttl, JSON.stringify(data)).catch(err => {
                        console.error("[Cache] Set Error:", err.message);
                    });
                }

                return originalJson.call(this, data);
            };

            next();
        } catch (err) {
            console.error("[Cache] Middleware Error:", err.message);
            next(); // Continue even if cache fails
        }
    };
};

/**
 * Clear cache by pattern
 * Useful for invalidating cache when data changes
 */
export const clearCache = async (pattern) => {
    try {
        const keys = await redisClient.keys(`cache:${pattern}*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.info(`[Cache] Cleared ${keys.length} keys matching: ${pattern}`);
        }
    } catch (err) {
        console.error("[Cache] Clear Error:", err.message);
    }
};
