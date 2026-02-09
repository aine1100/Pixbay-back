import CircuitBreaker from "opossum";

const options = {
    timeout: 15000, // 15 seconds (SMTP can be slow)
    errorThresholdPercentage: 80, // Trip if 80% fail (less aggressive)
    resetTimeout: 30000 // try again after 30 seconds
};

/**
 * Creates a Circuit Breaker for a service function
 * @param {Function} serviceFunction - The function to wrap
 * @param {string} serviceName - Human readable name for logging
 */
export const createBreaker = (serviceFunction, serviceName = "External Service") => {
    const breaker = new CircuitBreaker(serviceFunction, options);

    breaker.on("open", () => console.warn(`🚨 Circuit Breaker OPEN for: ${serviceName}`));
    breaker.on("halfOpen", () => console.info(`🟡 Circuit Breaker HALF-OPEN for: ${serviceName}`));
    breaker.on("close", () => console.info(`🟢 Circuit Breaker CLOSED for: ${serviceName}`));

    // Provide a standardized fallback if needed
    breaker.fallback((_args, err) => {
        console.error(`🔴 Fallback triggered for ${serviceName}:`, err?.message || err || "Unknown error");
        throw new Error(`${serviceName} is currently unavailable. Please try again later.`);
    });

    return breaker;
};
