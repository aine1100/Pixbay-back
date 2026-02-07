import * as adminService from "../../service/admin/admin.js";

/**
 * Get all users with filters
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await adminService.getAllUsers(req.query);
        res.status(200).json({
            success: true,
            count: users.length,
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
 * Get all creators with filters (status, type)
 */
export const getCreators = async (req, res) => {
    try {
        const creators = await adminService.getCreators(req.query);
        res.status(200).json({
            success: true,
            count: creators.length,
            data: creators
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Approve or Reject a creator verification request
 */
export const approveCreator = async (req, res) => {
    try {
        const { creatorId } = req.params;
        const result = await adminService.verifyCreator(creatorId, req.body);
        res.status(200).json({
            success: true,
            message: `Creator ${req.body.status} successfully`,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
