import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { 
    generateAccessToken, 
    generateRefreshToken, 
    generateOTP, 
    generateResetToken 
} from "../../utils/tokens.js";
import { sendEmail } from "../../utils/email.js";
import { otpTemplate, passwordResetTemplate } from "../../utils/emailTemplates.js";

/**
 * Register a new user and generate OTP for verification
 */
export const registerUser = async (userData) => {
    const { password, firstName, lastName, role, email } = userData;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    })

    if (existingUser) {
        throw new Error("User with this email already exists")
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const user = await prisma.user.create({
        data: {
            passwordHash,
            firstName,
            lastName,
            email,
            role: role || "CLIENT",
            isActive: true,
            isVerified: false,
            otp,
            otpExpires
        }
    })

    // Send the OTP via email using reusable template
    const template = otpTemplate(firstName, otp);
    await sendEmail(email, template.subject, template.html);

    const { passwordHash: _, otp: __, otpExpires: ___, ...userRegistered } = user;
    return userRegistered;
}

/**
 * Verify account using OTP
 */
export const verifyOTP = async (email, otp) => {
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.isVerified) {
        throw new Error("Account is already verified");
    }

    if (user.otp !== otp) {
        throw new Error("Invalid OTP");
    }

    if (user.otpExpires < new Date()) {
        throw new Error("OTP has expired");
    }

    // Mark as verified and clear OTP fields
    await prisma.user.update({
        where: { email },
        data: {
            isVerified: true,
            otp: null,
            otpExpires: null
        }
    });

    return { message: "Account verified successfully" };
}

/**
 * Login user and issue access/refresh tokens
 */
export const LoginUser = async (userData) => {
    const { email, password } = userData;

    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        throw new Error("No user with this email found")
    }

    const checkPassword = await bcrypt.compare(password, user.passwordHash)
    if (!checkPassword) {
        throw new Error("Invalid password")
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken }
}

/**
 * Request password reset token
 */
export const requestPasswordReset = async (email) => {
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new Error("User with this email does not exist");
    }

    const resetToken = generateResetToken();
    const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

    await prisma.user.update({
        where: { email },
        data: {
            resetToken,
            resetTokenExpires
        }
    });

    // Generate reset URL
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetURL = `${frontendURL}/reset-password?token=${resetToken}`;

    // Send reset URL via email using reusable template
    const template = passwordResetTemplate(user.firstName, resetURL);
    await sendEmail(email, template.subject, template.html);

    return { message: "Password reset link sent to your email" };
}

/**
 * Reset password using token
 */
export const resetPassword = async (resetToken, newPassword) => {
    const user = await prisma.user.findUnique({
        where: { resetToken }
    });

    if (!user) {
        throw new Error("Invalid or expired reset token");
    }

    if (user.resetTokenExpires < new Date()) {
        throw new Error("Reset token has expired");
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetToken: null,
            resetTokenExpires: null
        }
    });

    return { message: "Password has been reset successfully" };
}

/**
 * Logout user by deleting their refresh token
 */
export const logoutUser = async (refreshToken) => {
    if (!refreshToken) {
        throw new Error("Refresh token is required");
    }

    await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
    });

    return { message: "Logged out successfully" };
}
