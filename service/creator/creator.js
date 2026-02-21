import prisma from "../../prisma/client.js";
import { initWallet } from "../wallet/walletService.js";

/**
 * Step 1: Submit Identity Documents
 * @param {string} userId - ID of the user (who must have role CREATOR or be upgrading)
 * @param {Object} idData - { nationalId, idFrontUrl, idBackUrl, country }
 */
export const submitIdentity = async (userId, idData) => {
    // Check if creator profile exists or create one
    let creator = await prisma.creator.findUnique({
        where: { userId }
    });

    if (!creator) {
        // We'll create a skeletal creator profile if it doesn't exist
        creator = await prisma.creator.create({
            data: {
                userId,
                creatorType: "PHOTOGRAPHER", // Default, can be updated later
                bio: "Pending activation",
                verificationStatus: "PENDING",
                documents: idData
            }
        });
        await initWallet(creator.id);
    } else {
        creator = await prisma.creator.update({
            where: { userId },
            data: {
                documents: {
                    ...(creator.documents || {}),
                    ...idData
                },
                verificationStatus: "PENDING"
            }
        });
    }

    return { message: "Identity documents submitted successfully", creator };
};

/**
 * Step 2: Submit Portfolio Items
 * Support for Photos, Videos, PDFs, CVs, and external Links
 */
export const submitPortfolio = async (userId, portfolioData) => {
    const creator = await prisma.creator.findUnique({
        where: { userId }
    });

    if (!creator) {
        throw new Error("Creator profile not found. Complete Step 1 first.");
    }

    const { items } = portfolioData; // Array of { type, url, metadata }

    if (!items || !Array.isArray(items)) {
        throw new Error("Portfolio items must be an array");
    }

    const createdItems = await prisma.$transaction(
        items.map(item =>
            prisma.portfolioMedia.create({
                data: {
                    creatorId: creator.id,
                    type: item.type, // "IMAGE", "VIDEO", "DOCUMENT", "LINK"
                    url: item.url,
                    metadata: item.metadata || {}
                }
            })
        )
    );

    return { message: "Portfolio items added successfully", count: createdItems.length };
};

/**
 * Step 3: Submit Equipment List
 * @param {string} userId
 * @param {Array} equipmentList - Array of equipment names/objects
 */
export const submitEquipment = async (userId, equipmentList) => {
    const creator = await prisma.creator.findUnique({
        where: { userId }
    });

    if (!creator) {
        throw new Error("Creator profile not found. Complete Step 1 first.");
    }

    const updatedCreator = await prisma.creator.update({
        where: { userId },
        data: {
            equipment: equipmentList,
            // If all steps are complete, we might set a flag or keep as PENDING for admin review
            verificationStatus: "PENDING"
        }
    });

    return { message: "Equipment list updated successfully", equipment: updatedCreator.equipment };
};

/**
 * Update general creator profile details (Bio, Business Name, Location, etc.)
 * @param {string} userId
 * @param {Object} data - fields to update
 */
export const updateCreatorProfile = async (userId, data) => {
    const creator = await prisma.creator.findUnique({
        where: { userId }
    });

    if (!creator) {
        throw new Error("Creator profile not found");
    }

    // Extract valid fields to avoid overwriting critical ones like `verificationStatus` accidentally
    // unless this method is strictly controlled.
    const {
        businessName,
        bio,
        creatorType,
        baseCity,
        country,
        portfolioLinks,
        pricing,
        availability,
        specializations
    } = data;

    const updatedCreator = await prisma.creator.update({
        where: { userId },
        data: {
            ...(businessName !== undefined && { businessName }),
            ...(bio !== undefined && { bio }),
            ...(creatorType !== undefined && { creatorType }),
            ...(baseCity !== undefined && { baseCity }),
            ...(country !== undefined && { country }),
            ...(portfolioLinks !== undefined && { portfolioLinks }),
            ...(pricing !== undefined && { pricing }),
            ...(availability !== undefined && { availability }),
            ...(specializations !== undefined && { specializations })
        }
    });

    return { message: "Profile updated successfully", creator: updatedCreator };
};

/**
 * Get all reviews for a creator
 * @param {string} userId - ID of the user (creator)
 */
export const getCreatorReviews = async (userId) => {
    const creator = await prisma.creator.findUnique({
        where: { userId }
    });

    if (!creator) {
        throw new Error("Creator profile not found");
    }

    const reviews = await prisma.review.findMany({
        where: { revieweeId: userId },
        include: {
            reviewer: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profilePicture: true
                }
            },
            booking: {
                select: {
                    bookingNumber: true,
                    category: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return reviews;
};
/**
 * Update a specific portfolio item's metadata
 */
export const updatePortfolioItem = async (userId, itemId, data) => {
    const creator = await prisma.creator.findUnique({
        where: { userId }
    });

    if (!creator) throw new Error("Creator not found");

    const item = await prisma.portfolioMedia.findUnique({
        where: { id: itemId }
    });

    if (!item || item.creatorId !== creator.id) {
        throw new Error("Portfolio item not found or unauthorized");
    }

    const updatedItem = await prisma.portfolioMedia.update({
        where: { id: itemId },
        data: {
            metadata: {
                ...(item.metadata || {}),
                ...data
            }
        }
    });

    return { message: "Item updated successfully", item: updatedItem };
};

/**
 * Delete a specific portfolio item
 */
export const deletePortfolioItem = async (userId, itemId) => {
    const creator = await prisma.creator.findUnique({
        where: { userId }
    });

    if (!creator) throw new Error("Creator not found");

    const item = await prisma.portfolioMedia.findUnique({
        where: { id: itemId }
    });

    if (!item || item.creatorId !== creator.id) {
        throw new Error("Portfolio item not found or unauthorized");
    }

    await prisma.portfolioMedia.delete({
        where: { id: itemId }
    });

    return { message: "Item deleted successfully" };
};
