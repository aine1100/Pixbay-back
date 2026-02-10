import * as authService from "../../service/auth/auth.js";


export const register = async (req, res) => {
    try {
        console.log("[Backend] Received registration request:", req.body);
        const userData = req.body;

        if (!userData.password || !userData.firstName || !userData.lastName || !userData.email) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: email, password, firstName, lastName",
            });
        }

        const newUser = await authService.registerUser(userData);

        res.status(201).json({
            success: true,
            data: newUser,
            message: "User registered successfully. Please verify your account with the OTP sent to your email.",
        });
    } catch (error) {
        console.error("Registration Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Controller for account verification
 */
export const verifyAccount = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }
        const result = await authService.verifyOTP(email, otp);
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const userAgent = req.get("User-Agent") || "";
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Simple device detection
        let deviceInfo = "Desktop";
        if (/mobile/i.test(userAgent)) deviceInfo = "Mobile Device";
        if (/tablet/i.test(userAgent)) deviceInfo = "Tablet";

        const result = await authService.LoginUser(req.body, {
            ipAddress,
            userAgent,
            deviceInfo
        });

        res.status(200).json({
            success: true,
            data: result,
            message: "Login successful",
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to request password reset
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }
        const result = await authService.requestPasswordReset(email);
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to reset password
 */
export const resetUserPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email, OTP, and new password are required"
            });
        }
        const result = await authService.resetPassword(email, otp, newPassword);
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to logout user
 */
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required"
            });
        }
        const result = await authService.logoutUser(refreshToken);
        res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const googleSignIn = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Firebase ID Token is required"
            });
        }

        const userAgent = req.get("User-Agent") || "";
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        // Simple device detection
        let deviceInfo = "Desktop";
        if (/mobile/i.test(userAgent)) deviceInfo = "Mobile Device";
        if (/tablet/i.test(userAgent)) deviceInfo = "Tablet";

        const result = await authService.googleLogin(idToken, {
            ipAddress,
            userAgent,
            deviceInfo
        });

        res.status(200).json({
            success: true,
            data: result,
            message: "Google login successful"
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to refresh access token
 */
export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshAccessToken(refreshToken);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};
