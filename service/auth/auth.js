import prisma from "../../prisma/client.js";
import admin from "../../utils/firebase.js";
import bcrypt from "bcrypt";
import {
    generateAccessToken,
    generateRefreshToken,
    generateOTP
} from "../../utils/tokens.js";
import { otpTemplate, passwordResetOTPTemplate } from "../../utils/emailTemplates.js";
import { emailQueue } from "../../utils/queue.js";

/**
 * Register a new user and generate OTP for verification
 */
export const registerUser = async (userData) => {
    const { password, firstName, lastName, role, email } = userData;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error("User with this email already exists");
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    let user;
    try {
        user = await prisma.user.create({
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
        });

        // Offload the OTP via email to background queue
        const template = otpTemplate(firstName, otp);
        await emailQueue.add("sendOTP", {
            email,
            subject: template.subject,
            html: template.html
        });

        const { passwordHash: _1, otp: _2, otpExpires: _3, ...userRegistered } = user;
        return userRegistered;
    } catch (error) {
        // ROLLBACK: If user was created but email failed, remove user
        if (user?.id) {
            await prisma.user.delete({ where: { id: user.id } }).catch(e => console.error("Rollback failed:", e));
        }
        throw error;
    }
};

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
};

/**
 * Login user and issue access/refresh tokens
 */
export const LoginUser = async (userData) => {
    const { email, password } = userData;

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new Error("No user with this email found");
    }

    const checkPassword = await bcrypt.compare(password, user.passwordHash);
    if (!checkPassword) {
        throw new Error("Invalid password");
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Update lastLoginAt and create refresh token
    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    });

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
    });

    const { passwordHash: _unused, ...userWithoutPassword } = updatedUser;
    return { user: userWithoutPassword, accessToken, refreshToken };
};

/**
 * Request password reset OTP
 */
export const requestPasswordReset = async (email) => {
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new Error("User with this email does not exist");
    }

    const resetToken = generateOTP(); // Using 6-digit OTP for reset too
    const resetTokenExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

    try {
        await prisma.user.update({
            where: { email },
            data: {
                resetToken,
                resetTokenExpires
            }
        });

        // Send reset OTP via email using new template and queue
        const template = passwordResetOTPTemplate(user.firstName, resetToken);
        await emailQueue.add("sendPasswordReset", {
            email,
            subject: template.subject,
            html: template.html
        });

        return { message: "Password reset OTP sent to your email" };
    } catch (error) {
        // ROLLBACK: Clear reset tokens if email failed
        await prisma.user.update({
            where: { email },
            data: {
                resetToken: null,
                resetTokenExpires: null
            }
        }).catch(e => console.error("Rollback failed:", e));
        throw error;
    }
};

/**
 * Reset password using email and OTP
 */
export const resetPassword = async (email, otp, newPassword) => {
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.resetToken !== otp) {
        throw new Error("Invalid reset OTP");
    }

    if (user.resetTokenExpires < new Date()) {
        throw new Error("Reset OTP has expired");
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
};

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
};

/**
 * Handle Google Social login via Firebase ID token
 */
export const googleLogin = async (idToken) => {
    // 1. Verify the ID token using Firebase Admin
    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
        throw new Error("Invalid or expired Google ID Token");
    }

    const { email, name, picture, uid } = decodedToken;

    // 2. Check if user exists
    let user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        // 3. Auto-provision new user
        const names = name ? name.split(" ") : ["Google", "User"];
        user = await prisma.user.create({
            data: {
                email,
                firstName: names[0],
                lastName: names.slice(1).join(" ") || "User",
                isVerified: true, // Social accounts are verified by default
                profilePicture: picture,
                socialProvider: "GOOGLE",
                socialId: uid,
                isActive: true
            }
        });
    }

    // 4. Update last login and issue tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    });

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    });

    const { passwordHash: _unused, resetToken: _1, otp: _2, ...userSafe } = updatedUser;
    return { user: userSafe, accessToken, refreshToken };
};
