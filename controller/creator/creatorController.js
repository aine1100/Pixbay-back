import * as creatorService from "../../service/creator/creator.js";
import { uploadFile, deleteFiles } from "../../utils/supabase.js";

/**
 * Controller for Step 1: Identity Verification
 */
export const activateIdentity = async (req, res) => {
    const uploadedPaths = [];
    try {
        const userId = req.user.id;
        const { nationalId, country } = req.body;

        let idFrontUrl, idBackUrl;

        // Upload files to Supabase if present
        if (req.files) {
            if (req.files.idFront) {
                const file = req.files.idFront[0];
                const path = `identity/${userId}_front_${Date.now()}`;
                idFrontUrl = await uploadFile(path, file.buffer, undefined, { contentType: file.mimetype });
                uploadedPaths.push(path);
            }
            if (req.files.idBack) {
                const file = req.files.idBack[0];
                const path = `identity/${userId}_back_${Date.now()}`;
                idBackUrl = await uploadFile(path, file.buffer, undefined, { contentType: file.mimetype });
                uploadedPaths.push(path);
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
        // ROLLBACK: Delete files from Supabase if DB operation failed
        if (uploadedPaths.length > 0) {
            await deleteFiles(uploadedPaths).catch(e => console.error("Identity file rollback failed:", e));
        }
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
    const uploadedPaths = [];
    try {
        const userId = req.user.id;
        const { links, title, explanation } = req.body; // Array of external links + project info
        const items = [];
        const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Add links if provided
        if (links && Array.isArray(links)) {
            links.forEach(link => {
                items.push({ 
                    type: "LINK", 
                    url: link, 
                    metadata: { 
                        title: title || "External Link", 
                        description: explanation || "View external work",
                        projectId
                    } 
                });
            });
        }

        // Upload portfolio files (Photos, Videos, PDFs)
        if (req.files && req.files.portfolio) {
            await Promise.all(req.files.portfolio.map(async (file) => {
                const type = file.mimetype.startsWith("image/") ? "IMAGE" :
                    file.mimetype.startsWith("video/") ? "VIDEO" : "DOCUMENT";

                const path = `portfolio/${userId}_${Date.now()}_${file.originalname}`;
                const url = await uploadFile(path, file.buffer, undefined, { contentType: file.mimetype });
                uploadedPaths.push(path);
                items.push({ 
                    type, 
                    url, 
                    metadata: { 
                        originalName: file.originalname,
                        title: title || "Work Sample",
                        description: explanation || "Creative showcase item",
                        projectId
                    } 
                });
            }));
        }

        const result = await creatorService.submitPortfolio(userId, { items });

        res.status(200).json({
            success: true,
            message: result.message,
            count: result.count
        });
    } catch (error) {
        // ROLLBACK: Delete files from Supabase if DB operation failed
        if (uploadedPaths.length > 0) {
            await deleteFiles(uploadedPaths).catch(e => console.error("Portfolio file rollback failed:", e));
        }
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

/**
 * Controller for General Profile Update
 */
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await creatorService.updateCreatorProfile(userId, req.body);

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
