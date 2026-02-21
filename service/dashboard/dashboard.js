import prisma from "../../prisma/client.js";

/**
 * Get statistics for a client dashboard
 */
export const getClientStats = async (userId) => {
    // 1. Total Bookings
    const totalBookings = await prisma.booking.count({
        where: { clientId: userId }
    });

    // 2. Total Spent (Completed Payments)
    const spentAggregate = await prisma.transaction.aggregate({
        where: {
            userId,
            type: "PAYMENT",
            status: "COMPLETED"
        },
        _sum: {
            amount: true
        }
    });

    // 3. Total Messages (Chats count)
    const totalMessages = await prisma.chat.count({
        where: {
            OR: [
                { user1Id: userId },
                { user2Id: userId }
            ]
        }
    });

    return {
        totalBookings,
        totalSpent: Number(spentAggregate._sum.amount) || 0,
        totalMessages
    };
};

/**
 * Get statistics for a creator dashboard
 */
export const getCreatorStats = async (userId) => {
    // Need creator ID first
    const creator = await prisma.creator.findUnique({
        where: { userId },
        select: { id: true, averageRating: true }
    });

    if (!creator) return null;

    // 1. Total Projects (Active or Completed)
    const totalProjects = await prisma.booking.count({
        where: {
            creatorId: creator.id,
            status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] }
        }
    });

    // 2. Income (Sum of completed transactions)
    const incomeAggregate = await prisma.transaction.aggregate({
        where: {
            creatorId: creator.id,
            type: "PAYMENT",
            status: "COMPLETED"
        },
        _sum: {
            amount: true
        }
    });

    // 3. Ratings
    const averageRating = parseFloat(creator.averageRating) || 0;

    // 4. Completed Orders
    const completedOrders = await prisma.booking.count({
        where: {
            creatorId: creator.id,
            status: "COMPLETED"
        }
    });

    return {
        totalProjects,
        income: Number(incomeAggregate._sum.amount) || 0,
        averageRating,
        completedOrders
    };
};

/**
 * Get calendar events (sessions) for a user
 */
export const getCalendarEvents = async (userId, role, month, year) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const whereClause = {
        scheduledDate: {
            gte: startDate,
            lte: endDate
        }
    };

    if (role === "CREATOR") {
        whereClause.booking = {
            creator: { userId }
        };
    } else {
        whereClause.booking = {
            clientId: userId
        };
    }

    const sessions = await prisma.bookingSession.findMany({
        where: whereClause,
        include: {
            booking: {
                select: {
                    bookingNumber: true,
                    status: true,
                    category: true,
                    client: { select: { firstName: true, lastName: true } },
                    creator: {
                        include: {
                            user: { select: { firstName: true, lastName: true } }
                        }
                    }
                }
            }
        },
        orderBy: {
            scheduledDate: "asc"
        }
    });

    return sessions;
};

/**
 * Get recent transactions for a user
 */
export const getRecentTransactions = async (userId, role, limit = 5) => {
    const whereClause = {};
    if (role === "CREATOR") {
        whereClause.creatorId = (await prisma.creator.findUnique({ where: { userId }, select: { id: true } }))?.id;
        if (!whereClause.creatorId) return [];
    } else {
        whereClause.userId = userId;
    }

    const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            booking: {
                select: {
                    category: true,
                    bookingNumber: true
                }
            }
        }
    });

    return transactions;
};

/**
 * Get recent bookings for a user
 */
export const getRecentBookings = async (userId, role, limit = 5) => {
    const whereClause = {};
    if (role === "CREATOR") {
        whereClause.creator = { userId };
    } else {
        whereClause.clientId = userId;
    }

    const bookings = await prisma.booking.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            client: {
                select: {
                    firstName: true,
                    lastName: true,
                    profilePicture: true
                }
            },
            creator: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            profilePicture: true
                        }
                    }
                }
            }
        }
    });

    return bookings;
};
