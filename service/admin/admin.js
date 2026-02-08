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

/**
 * Resolve an open dispute
 */
export const resolveDispute = async (disputeId, adminId, resolutionData) => {
    const { status, resolution, refundAmount = 0 } = resolutionData;

    const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
            booking: true,
            raiser: true
        }
    });

    if (!dispute) {
        throw new Error("Dispute not found");
    }

    if (dispute.status === "RESOLVED") {
        throw new Error("This dispute is already resolved");
    }

    // Update the dispute
    const updatedDispute = await prisma.dispute.update({
        where: { id: disputeId },
        data: {
            status: status || "RESOLVED",
            resolution: {
                text: resolution,
                refundAmount,
                resolvedAt: new Date(),
                resolvedBy: adminId
            },
            assignedTo: adminId
        }
    });

    // Log the resolution in the booking status if fully resolved
    if (status === "RESOLVED") {
        await prisma.booking.update({
            where: { id: dispute.bookingId },
            data: { status: "COMPLETED" } // Or keep as DISPUTED if refund? Usually COMPLETED/CANCELLED
        });
    }

    return updatedDispute;
};

/**
 * Get comprehensive platform summary for Admin dashboard
 */
export const getPlatformSummary = async () => {
    const [
        totalUsers,
        totalCreators,
        totalClients,
        bookingStats,
        disputeStats,
        transactionStats
    ] = await Promise.all([
        prisma.user.count(),
        prisma.creator.count(),
        prisma.user.count({ where: { role: "CLIENT" } }),
        prisma.booking.groupBy({
            by: ["status"],
            _count: true
        }),
        prisma.dispute.groupBy({
            by: ["status"],
            _count: true
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { status: "COMPLETED" }
        })
    ]);

    // Format booking stats into a more readable object
    const bookings = bookingStats.reduce((acc, curr) => {
        acc[curr.status.toLowerCase()] = curr._count;
        return acc;
    }, { pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0, disputed: 0 });

    // Format dispute stats
    const disputes = disputeStats.reduce((acc, curr) => {
        acc[curr.status.toLowerCase()] = curr._count;
        return acc;
    }, { open: 0, resolved: 0, under_review: 0 });

    return {
        users: {
            total: totalUsers,
            clients: totalClients,
            creators: totalCreators
        },
        bookings,
        disputes,
        financials: {
            totalRevenue: transactionStats._sum.amount || 0,
            currency: "KES"
        },
        timestamp: new Date()
    };
};
