import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
    );
};

export const generateRefreshToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
    );
};

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateResetToken = () => {
    return crypto.randomBytes(32).toString("hex");
};