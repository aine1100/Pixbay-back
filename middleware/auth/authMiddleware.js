import jwt from "jsonwebtoken";
import prisma from "../../prisma/client.js";

/**
 * Middleware to protect routes - checks for valid JWT access token
 */
export const protect = async (req, res, next) => {
    let token;

    // 1) Check if token exists in headers
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "You are not logged in. Please log in to get access.",
        });
    }

    try {
        // 2) Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const currentUser = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: "The user belonging to this token no longer exists.",
            });
        }

        // 4) Check if user is active
        if (!currentUser.isActive) {
            return res.status(401).json({
                success: false,
                message: "This user account is deactivated.",
            });
        }

        // GRANT ACCESS TO PROTECTED ROUTE
        req.user = currentUser;
        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid token or token has expired.",
        });
    }
};

/**
 * Middleware to restrict access based on roles
 * @param {...string} roles - Allowed roles
 */
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action",
            });
        }
        next();
    };
};
