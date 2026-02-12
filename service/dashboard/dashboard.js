import prisma from "../../prisma/client.js";

/**
 * Get statistics for a client dashboard
 */
export const getClientStats = async (userId) => {
    // 1. Active Bookings (Confirmed or In Progress)
    const activeBookings = await prisma.booking.count({
        where: {
            clientId: userId,
            status: { in: ["CONFIRMED", "IN_PROGRESS"] }
        }
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

    // 3. Pending Reviews (Completed bookings without a review from this client)
    const pendingReviews = await prisma.booking.count({
        where: {
            clientId: userId,
            status: "COMPLETED",
            reviews: {
                none: {
                    reviewerId: userId
                }
            }
        }
    });

    // 4. Completed Orders
    const completedOrders = await prisma.booking.count({
        where: {
            clientId: userId,
            status: "COMPLETED"
        }
    });

    return {
        activeBookings,
        totalSpent: spentAggregate._sum.amount || 0,
        pendingReviews,
        completedOrders
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

    // 2. Income (Payouts completed)
    const incomeAggregate = await prisma.transaction.aggregate({
        where: {
            creatorId: creator.id,
            type: "PAYOUT",
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
        income: incomeAggregate._sum.amount || 0,
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
