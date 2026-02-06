import * as userService from "../../service/user/user.js";

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
