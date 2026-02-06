import * as creatorService from "../../service/creator/creator.js";
import { uploadFile } from "../../utils/supabase.js";

/**
 * Controller for Step 1: Identity Verification
 */
export const activateIdentity = async (req, res) => {
    try {
        const userId = req.user.id;
        const { nationalId, country } = req.body;

        let idFrontUrl, idBackUrl;

        // Upload files to Supabase if present
        if (req.files) {
            if (req.files.idFront) {
                const file = req.files.idFront[0];
                idFrontUrl = await uploadFile('creators', `identity/${userId}_front_${Date.now()}`, file.buffer, { contentType: file.mimetype });
            }
            if (req.files.idBack) {
                const file = req.files.idBack[0];
                idBackUrl = await uploadFile('creators', `identity/${userId}_back_${Date.now()}`, file.buffer, { contentType: file.mimetype });
            }
        }

        const result = await creatorService.submitIdentity(userId, {
            nationalId,
            country,
            idFrontUrl,
            idBackUrl
        });

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.creator
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller for Step 2: Portfolio Upload
 */
export const uploadPortfolio = async (req, res) => {
    try {
        const userId = req.user.id;
        const { links } = req.body; // Array of external links
        const items = [];

        // Add links if provided
        if (links && Array.isArray(links)) {
            links.forEach(link => {
                items.push({ type: 'LINK', url: link });
            });
        }

        // Upload portfolio files (Photos, Videos, PDFs)
        if (req.files && req.files.portfolio) {
            await Promise.all(req.files.portfolio.map(async (file) => {
                const type = file.mimetype.startsWith('image/') ? 'IMAGE' :
                    file.mimetype.startsWith('video/') ? 'VIDEO' : 'DOCUMENT';

                const url = await uploadFile('creators', `portfolio/${userId}_${Date.now()}_${file.originalname}`, file.buffer, { contentType: file.mimetype });
                items.push({ type, url, metadata: { originalName: file.originalname } });
            }));
        }

        const result = await creatorService.submitPortfolio(userId, { items });

        res.status(200).json({
            success: true,
            message: result.message,
            count: result.count
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller for Step 3: Equipment List
 */
export const updateEquipment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { equipment } = req.body; // Array of equipment Strings or Objects

        if (!equipment || !Array.isArray(equipment)) {
            return res.status(400).json({
                success: false,
                message: "Equipment list is required as an array"
            });
        }

        const result = await creatorService.submitEquipment(userId, equipment);

        res.status(200).json({
            success: true,
            message: result.message,
            data: result.equipment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
