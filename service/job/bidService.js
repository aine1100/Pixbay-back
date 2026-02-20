import prisma from "../../prisma/client.js";

/**
 * Submit a bid on a job
 */
export const createBid = async (creatorId, jobId, bidData) => {
    // Verify the job exists and is active
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");
    if (job.status !== "ACTIVE") throw new Error("This job is no longer accepting bids");

    // Get the creator record from the userId
    const creator = await prisma.creator.findUnique({ where: { userId: creatorId } });
    if (!creator) throw new Error("You must be a registered creator to bid");

    // Check if creator already bid on this job
    const existingBid = await prisma.bid.findUnique({
        where: { jobId_creatorId: { jobId, creatorId: creator.id } }
    });
    if (existingBid) throw new Error("You have already placed a bid on this job");

    return await prisma.bid.create({
        data: {
            jobId,
            creatorId: creator.id,
            amount: parseFloat(bidData.amount),
            message: bidData.message,
            portfolio: bidData.portfolio || null
        },
        include: {
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
};

/**
 * Get all bids for a specific job
 */
export const getBidsForJob = async (jobId) => {
    return await prisma.bid.findMany({
        where: { jobId },
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
};

/**
 * Get all bids placed by a creator
 */
export const getMyBids = async (userId) => {
    const creator = await prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new Error("Creator profile not found");

    return await prisma.bid.findMany({
        where: { creatorId: creator.id },
        include: {
            job: {
                include: {
                    client: {
                        select: {
                            firstName: true,
                            lastName: true,
                            profilePicture: true
                        }
                    },
                    category: true,
                    booking: true,
                    _count: { select: { bids: true } }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });
};

/**
 * Update a bid (creator can edit their bid)
 */
export const updateBid = async (bidId, userId, updateData) => {
    const creator = await prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new Error("Creator profile not found");

    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) throw new Error("Bid not found");
    if (bid.creatorId !== creator.id) throw new Error("You can only edit your own bids");
    if (bid.status !== "PENDING") throw new Error("Can only edit pending bids");

    return await prisma.bid.update({
        where: { id: bidId },
        data: {
            ...(updateData.amount && { amount: parseFloat(updateData.amount) }),
            ...(updateData.message && { message: updateData.message }),
            ...(updateData.portfolio !== undefined && { portfolio: updateData.portfolio })
        }
    });
};

/**
 * Withdraw a bid (creator removes their bid)
 */
export const withdrawBid = async (bidId, userId) => {
    const creator = await prisma.creator.findUnique({ where: { userId } });
    if (!creator) throw new Error("Creator profile not found");

    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) throw new Error("Bid not found");
    if (bid.creatorId !== creator.id) throw new Error("You can only withdraw your own bids");

    return await prisma.bid.update({
        where: { id: bidId },
        data: { status: "WITHDRAWN" }
    });
};

/**
 * Accept a bid (client accepts a creator's bid)
 */
export const acceptBid = async (bidId, clientId) => {
    const bid = await prisma.bid.findUnique({
        where: { id: bidId },
        include: { job: true }
    });

    if (!bid) throw new Error("Bid not found");
    if (bid.job.clientId !== clientId) throw new Error("Only the job owner can accept bids");
    if (bid.job.status !== "ACTIVE") throw new Error("Job is no longer active");

    // Accept this bid and reject all others in a transaction
    return await prisma.$transaction(async (tx) => {
        // Accept the selected bid
        const accepted = await tx.bid.update({
            where: { id: bidId },
            data: { status: "ACCEPTED" },
            include: {
                creator: {
                    include: {
                        user: {
                            select: { firstName: true, lastName: true, profilePicture: true }
                        }
                    }
                },
                job: true
            }
        });

        // Reject all other pending bids
        await tx.bid.updateMany({
            where: {
                jobId: bid.jobId,
                id: { not: bidId },
                status: "PENDING"
            },
            data: { status: "REJECTED" }
        });

        // Create the booking for this job
        const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await tx.booking.create({
            data: {
                bookingNumber,
                clientId: bid.job.clientId,
                creatorId: bid.creatorId,
                jobId: bid.jobId,
                serviceType: "PROJECT_BASED",
                status: "PENDING",
                paymentStatus: "PENDING",
                bookingDetails: {
                    jobTitle: bid.job.title,
                    jobDescription: bid.job.description,
                    acceptedBidId: bid.id
                },
                pricing: {
                    totalAmount: parseFloat(bid.amount),
                    currency: "RWF", // Default currency
                    isCustomBudget: true
                }
            }
        });

        // Update the job status to FILLED
        await tx.job.update({
            where: { id: bid.jobId },
            data: { status: "FILLED" }
        });

        return accepted;
    });
};

/**
 * Reject a bid (client rejects a specific bid)
 */
export const rejectBid = async (bidId, clientId) => {
    const bid = await prisma.bid.findUnique({
        where: { id: bidId },
        include: { job: true }
    });

    if (!bid) throw new Error("Bid not found");
    if (bid.job.clientId !== clientId) throw new Error("Only the job owner can reject bids");

    return await prisma.bid.update({
        where: { id: bidId },
        data: { status: "REJECTED" }
    });
};
