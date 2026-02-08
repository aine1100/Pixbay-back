import prisma from "../../prisma/client.js";

/**
 * List all users with role filtering
 */
export const getAllUsers = async (filters = {}) => {
    const { role, isActive } = filters;
    return await prisma.user.findMany({
        where: {
            ...(role && { role }),
            ...(isActive !== undefined && { isActive: isActive === "true" })
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true
        },
        orderBy: { createdAt: "desc" }
    });
};

/**
 * List creators with verification and type filtering
 */
export const getCreators = async (filters = {}) => {
    const { status, type } = filters;
    return await prisma.creator.findMany({
        where: {
            ...(status && { verificationStatus: status }),
            ...(type && { creatorType: type })
        },
        include: {
            user: {
                select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                    city: true,
                    country: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });
};

/**
 * Manual creator verification/approval
 */
export const verifyCreator = async (creatorId, data) => {
    const { status, verifiedBadge = false } = data;
    
    // 1. Find the creator first (support both creator.id and creator.userId)
    const creatorRecord = await prisma.creator.findFirst({
        where: {
            OR: [
                { id: creatorId },
                { userId: creatorId }
            ]
        }
    });

    if (!creatorRecord) {
        throw new Error("Creator not found with the provided identifier");
    }

    // 2. Update Creator status
    const updatedCreator = await prisma.creator.update({
        where: { id: creatorRecord.id },
        data: {
            verificationStatus: status, // APPROVED, REJECTED, etc.
            isVerified: status === "APPROVED",
            verifiedBadge: status === "APPROVED" ? verifiedBadge : false,
            approvedAt: status === "APPROVED" ? new Date() : null
        },
        include: { user: true }
    });

    // 3. Also update User isVerified if approved
    if (status === "APPROVED") {
        await prisma.user.update({
            where: { id: updatedCreator.userId },
            data: { isVerified: true }
        });
    }

    return updatedCreator;
};
