import prisma from "../../prisma/client.js";

/**
 * List all users with role filtering
 */
export const getAllUsers = async (filters = {}) => {
    const { role, isActive } = filters;
    return await prisma.user.findMany({
        where: {
            ...(role && { role }),
            ...(isActive !== undefined && { isActive: isActive === 'true' })
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
        orderBy: { createdAt: 'desc' }
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
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Manual creator verification/approval
 */
export const verifyCreator = async (creatorId, data) => {
    const { status, verifiedBadge = false } = data;
    
    // 1. Update Creator status
    const creator = await prisma.creator.update({
        where: { id: creatorId },
        data: {
            verificationStatus: status, // APPROVED, REJECTED, etc.
            isVerified: status === 'APPROVED',
            verifiedBadge: status === 'APPROVED' ? verifiedBadge : false,
            approvedAt: status === 'APPROVED' ? new Date() : null
        },
        include: { user: true }
    });

    // 2. Also update User isVerified if approved
    if (status === 'APPROVED') {
        await prisma.user.update({
            where: { id: creator.userId },
            data: { isVerified: true }
        });
    }

    return creator;
};
