import prisma from "../../prisma/client.js";

export const getUserProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new Error("User not found");
    }
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

export const updateUserProfile = async (userId, userData) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }

    });
    if (!user) {
        throw new Error("no user found wiht this id");
    }
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: userData
    });
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
};

export const getAllUsers = async () => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true
        }
    });
    return users;
};

export const deactivateUser = async (userId) => {
    await prisma.user.update({
        where: { id: userId },
        data: { isActive: false }
    });
    return { message: "User deactivated successfully" };
};

export const activateUser = async (userId) => {
    await prisma.user.update({
        where: { id: userId },
        data: { isActive: true }
    });
    return { message: "User activated successfully" };
};

export const getUserByEmail = async (email) => {
    const user = await prisma.user.findUnique({
        where: { email }
    });
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

export const updateUserRole = async (userId, role) => {
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role }
    });
    const { passwordHash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
};

export const deleteUser = async (userId) => {
    await prisma.user.delete({
        where: { id: userId }
    });
    return { message: "User deleted permanently" };
};

/**
 * Toggle saving a creator (Save/Unsave)
 */
export const toggleSavedCreator = async (userId, creatorId) => {
    const existing = await prisma.savedCreator.findUnique({
        where: {
            userId_creatorId: { userId, creatorId }
        }
    });

    if (existing) {
        await prisma.savedCreator.delete({
            where: { id: existing.id }
        });
        return { saved: false, message: "Creator removed from favorites" };
    } else {
        await prisma.savedCreator.create({
            data: { userId, creatorId }
        });
        return { saved: true, message: "Creator added to favorites" };
    }
};

/**
 * Get all creators saved by a user
 */
export const getSavedCreators = async (userId) => {
    const saved = await prisma.savedCreator.findMany({
        where: { userId },
        include: {
            creator: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            profilePicture: true,
                            city: true,
                            country: true
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return saved.map(s => ({
        savedAt: s.createdAt,
        ...s.creator
    }));
};
/**
 * Get all active sessions for a user
 */
export const getUserSessions = async (userId) => {
    return await prisma.refreshToken.findMany({
        where: {
            userId,
            isRevoked: false,
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: "desc" }
    });
};

export const revokeUserSession = async (userId, sessionId) => {
    const session = await prisma.refreshToken.findFirst({
        where: { id: sessionId, userId }
    });

    if (!session) {
        throw new Error("Session not found or doesn't belong to this user");
    }

    await prisma.refreshToken.update({
        where: { id: sessionId },
        data: { isRevoked: true }
    });

    return { message: "Session revoked successfully" };
};
