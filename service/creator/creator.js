import prisma from "../../prisma/client.js";

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
