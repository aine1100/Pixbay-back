import * as userService from "../../service/user/user.js";
import { updateFcmToken as updateToken } from "../../utils/notifications.js";

/**
 * Controller to get user profile
 */
export const getProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.getUserProfile(userId);
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to update user profile
 */
export const updateProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const userData = req.body;
        const updatedUser = await userService.updateUserProfile(userId, userData);
        res.status(200).json({
            success: true,
            data: updatedUser,
            message: "Profile updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to get all users
 */
export const listUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to deactivate user
 */
export const deactivate = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await userService.deactivateUser(userId);
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
 * Controller to activate user
 */
export const activate = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await userService.activateUser(userId);
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
 * Controller to delete user permanently
 */
export const removeUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await userService.deleteUser(userId);
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
 * Controller to update user role
 */
export const changeRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({
                success: false,
                message: "Role is required"
            });
        }
        const updatedUser = await userService.updateUserRole(userId, role);
        res.status(200).json({
            success: true,
            data: updatedUser,
            message: `User role updated to ${role}`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to get current user profile (me)
 */
export const getMe = async (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user
    });
};

/**
 * Controller to update current user profile (me)
 */
export const updateMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const userData = req.body;
        const updatedUser = await userService.updateUserProfile(userId, userData);
        res.status(200).json({
            success: true,
            data: updatedUser,
            message: "Profile updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to update FCM token
 */
export const updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        await updateToken(req.user.id, fcmToken);
        res.status(200).json({
            success: true,
            message: "FCM token updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
