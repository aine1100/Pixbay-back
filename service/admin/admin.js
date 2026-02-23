import prisma from "../../prisma/client.js";

/**
 * List all users with role filtering
 */
export const getAllUsers = async (filters = {}) => {
    const { role, isActive, search } = filters;
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
        ...(role && { role }),
        ...(isActive !== undefined && isActive !== "" && { isActive: isActive === "true" || isActive === true }),
        ...(search && {
            OR: [
                { email: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } }
            ]
        })
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: limit,
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
        }),
        prisma.user.count({ where })
    ]);

    return { users, total, page, limit };
};

const buildUserWhere = (filters = {}) => {
    const { role, isActive, search } = filters;
    return {
        ...(role && { role }),
        ...(isActive !== undefined && isActive !== "" && { isActive: isActive === "true" || isActive === true }),
        ...(search && {
            OR: [
                { email: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } }
            ]
        })
    };
};

/**
 * List creators with verification and type filtering
 */
export const getCreators = async (filters = {}) => {
    const { status, type, search } = filters;
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
        ...(status && { verificationStatus: status }),
        ...(type && { creatorType: type }),
        ...(search && {
            user: {
                OR: [
                    { email: { contains: search, mode: "insensitive" } },
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } }
                ]
            }
        })
    };

    const [creators, total] = await Promise.all([
        prisma.creator.findMany({
            where,
            skip,
            take: limit,
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
        }),
        prisma.creator.count({ where })
    ]);

    return { creators, total, page, limit };
};

const buildCreatorWhere = (filters = {}) => {
    const { status, type, search } = filters;
    return {
        ...(status && { verificationStatus: status }),
        ...(type && { creatorType: type }),
        ...(search && {
            user: {
                OR: [
                    { email: { contains: search, mode: "insensitive" } },
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } }
                ]
            }
        })
    };
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
 * Update user status/role (Admin)
 */
export const updateUser = async (userId, data) => {
    const updateData = {};

    if (data.isActive !== undefined) {
        updateData.isActive = !!data.isActive;
    }

    if (data.role) {
        updateData.role = data.role;
    }

    if (data.isVerified !== undefined) {
        updateData.isVerified = !!data.isVerified;
    }

    if (Object.keys(updateData).length === 0) {
        throw new Error("No valid fields provided for update");
    }

    return await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            isVerified: true
        }
    });
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
 * List disputes with filters (Admin)
 */
export const listDisputes = async (filters = {}) => {
    const { status, type } = filters;
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
        ...(status && { status }),
        ...(type && { type })
    };

    const [disputes, total] = await Promise.all([
        prisma.dispute.findMany({
            where,
            skip,
            take: limit,
            include: {
                booking: { select: { bookingNumber: true } },
                raiser: { select: { id: true, firstName: true, lastName: true, email: true } },
                admin: { select: { id: true, firstName: true, lastName: true, email: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.dispute.count({ where })
    ]);

    return { disputes, total, page, limit };
};

const buildDisputeWhere = (filters = {}) => {
    const { status, type } = filters;
    return {
        ...(status && { status }),
        ...(type && { type })
    };
};

/**
 * List transactions with filters (Admin)
 */
export const listTransactions = async (filters = {}) => {
    const { status, type, startDate, endDate } = filters;
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const createdAt = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate);

    const where = {
        ...(status && { status }),
        ...(type && { type }),
        ...(Object.keys(createdAt).length > 0 && { createdAt })
    };

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            skip,
            take: limit,
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                booking: { select: { bookingNumber: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.transaction.count({ where })
    ]);

    return { transactions, total, page, limit };
};

const buildTransactionWhere = (filters = {}) => {
    const { status, type, startDate, endDate } = filters;
    const createdAt = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate);
    return {
        ...(status && { status }),
        ...(type && { type }),
        ...(Object.keys(createdAt).length > 0 && { createdAt })
    };
};

/**
 * List jobs with filters (Admin)
 */
export const listJobs = async (filters = {}) => {
    const { status, search, categoryId } = filters;
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
        ...(status && { status }),
        ...(categoryId && { categoryId }),
        ...(search && {
            OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
            ]
        })
    };

    const [jobs, total] = await Promise.all([
        prisma.job.findMany({
            where,
            skip,
            take: limit,
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                category: true,
                _count: { select: { bids: true } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.job.count({ where })
    ]);

    return { jobs, total, page, limit };
};

const buildJobWhere = (filters = {}) => {
    const { status, search, categoryId } = filters;
    return {
        ...(status && { status }),
        ...(categoryId && { categoryId }),
        ...(search && {
            OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
            ]
        })
    };
};

/**
 * Update job status (Admin)
 */
export const updateJobStatus = async (jobId, data) => {
    const { status } = data;
    if (!status) throw new Error("Status is required");

    return await prisma.job.update({
        where: { id: jobId },
        data: { status },
        include: {
            category: true,
            _count: { select: { bids: true } }
        }
    });
};

/**
 * Get comprehensive platform summary for Admin dashboard
 */
export const getPlatformSummary = async (filters = {}) => {
    const rangeDays = parseInt(filters.rangeDays) || 30;
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate
        ? new Date(filters.startDate)
        : new Date(new Date(endDate).setDate(endDate.getDate() - rangeDays));

    const txRangeWhere = {
        createdAt: {
            gte: startDate,
            lte: endDate
        }
    };

    const [
        totalUsers,
        totalCreators,
        totalClients,
        bookingStats,
        disputeStats,
        transactionStats,
        commissionStats,
        volumeStats,
        activeUsers,
        newUsers,
        rangeTransactions,
        rangeUserCreates,
        rangeCreatorCreates,
        rangeJobCreates
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
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { status: "COMPLETED", type: "COMMISSION" }
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { status: "COMPLETED" }
        }),
        prisma.user.count({
            where: { lastLoginAt: { gte: startDate, lte: endDate } }
        }),
        prisma.user.count({
            where: { createdAt: { gte: startDate, lte: endDate } }
        }),
        prisma.transaction.findMany({
            where: {
                ...txRangeWhere,
                status: "COMPLETED"
            },
            select: {
                amount: true,
                type: true,
                createdAt: true
            },
            orderBy: { createdAt: "asc" }
        }),
        prisma.user.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { createdAt: true }
        }),
        prisma.creator.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { createdAt: true }
        }),
        prisma.job.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            select: { createdAt: true }
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

    const dailySeries = {};
    rangeTransactions.forEach((tx) => {
        const key = new Date(tx.createdAt).toISOString().slice(0, 10);
        if (!dailySeries[key]) {
            dailySeries[key] = { revenue: 0, commission: 0, volume: 0, count: 0 };
        }
        const amount = Number(tx.amount || 0);
        dailySeries[key].volume += amount;
        dailySeries[key].count += 1;
        if (tx.type === "COMMISSION") {
            dailySeries[key].commission += amount;
        } else if (tx.type === "PAYMENT") {
            dailySeries[key].revenue += amount;
        }
    });

    const analyticsSeries = Object.entries(dailySeries)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, values]) => ({
            date,
            ...values
        }));

    const totalCommission = rangeTransactions
        .filter((tx) => tx.type === "COMMISSION")
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const totalVolume = rangeTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const buildCountSeries = (rows) => {
        const seriesMap = {};
        rows.forEach((row) => {
            const key = new Date(row.createdAt).toISOString().slice(0, 10);
            seriesMap[key] = (seriesMap[key] || 0) + 1;
        });
        return Object.entries(seriesMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }));
    };

    const userGrowthSeries = buildCountSeries(rangeUserCreates);
    const creatorGrowthSeries = buildCountSeries(rangeCreatorCreates);
    const jobGrowthSeries = buildCountSeries(rangeJobCreates);

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
            totalCommission: commissionStats._sum.amount || 0,
            totalVolume: volumeStats._sum.amount || 0,
            currency: "RWF"
        },
        analytics: {
            range: { startDate, endDate },
            activeUsers,
            newUsers,
            totalCommission,
            totalVolume,
            transactionsCount: rangeTransactions.length,
            series: analyticsSeries,
            userGrowth: userGrowthSeries,
            creatorGrowth: creatorGrowthSeries,
            jobGrowth: jobGrowthSeries
        },
        timestamp: new Date()
    };
};

export const listCategories = async (filters = {}) => {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, type } = filters;

    const where = {
        ...(type && { type }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } }
            ]
        })
    };

    const [categories, total] = await Promise.all([
        prisma.category.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" }
        }),
        prisma.category.count({ where })
    ]);

    return { categories, total, page, limit };
};

const buildCategoryWhere = (filters = {}) => {
    const { search, type } = filters;
    return {
        ...(type && { type }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } }
            ]
        })
    };
};

export const exportUsers = async (filters = {}) => {
    const where = buildUserWhere(filters);
    return prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            lastLoginAt: true
        },
        orderBy: { createdAt: "desc" }
    });
};

export const exportCreators = async (filters = {}) => {
    const where = buildCreatorWhere(filters);
    return prisma.creator.findMany({
        where,
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

export const exportDisputes = async (filters = {}) => {
    const where = buildDisputeWhere(filters);
    return prisma.dispute.findMany({
        where,
        include: {
            booking: { select: { bookingNumber: true } },
            raiser: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
    });
};

export const exportTransactions = async (filters = {}) => {
    const where = buildTransactionWhere(filters);
    return prisma.transaction.findMany({
        where,
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            booking: { select: { bookingNumber: true } }
        },
        orderBy: { createdAt: "desc" }
    });
};

export const exportJobs = async (filters = {}) => {
    const where = buildJobWhere(filters);
    return prisma.job.findMany({
        where,
        include: {
            client: { select: { id: true, firstName: true, lastName: true, email: true } },
            category: true
        },
        orderBy: { createdAt: "desc" }
    });
};

export const exportSupportTickets = async (filters = {}) => {
    const { status, search } = filters;
    const where = {
        ...(status && { status }),
        ...(search && {
            OR: [
                { subject: { contains: search, mode: "insensitive" } },
                { message: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } }
            ]
        })
    };
    return prisma.supportTicket.findMany({
        where,
        include: {
            user: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
    });
};

export const exportCategories = async (filters = {}) => {
    const where = buildCategoryWhere(filters);
    return prisma.category.findMany({
        where,
        orderBy: { createdAt: "desc" }
    });
};
