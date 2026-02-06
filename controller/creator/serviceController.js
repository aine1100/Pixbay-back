import * as creatorDataService from "../../service/creator/service.js";

/**
 * Update creator pricing structure
 */
export const updatePricing = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await creatorDataService.updatePricing(userId, req.body);
        res.status(200).json({
            success: true,
            message: "Pricing updated successfully",
            data: result.pricing
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get public profile of a creator
 */
export const getProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await creatorDataService.getPublicProfile(id);
        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Creator profile not found"
            });
        }
        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Browse creators with filters
 */
export const browseCreators = async (req, res) => {
    try {
        const creators = await creatorDataService.listCreators(req.query);
        res.status(200).json({
            success: true,
            data: creators
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
