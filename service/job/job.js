import prisma from "../../prisma/client.js";

/**
 * Create a new job request
 */
export const createJob = async (clientId, jobData) => {
    return await prisma.job.create({
        data: {
            clientId,
            title: jobData.title,
            description: jobData.description,
            budget: jobData.budget ? parseFloat(jobData.budget) : null,
            location: jobData.location || null,
            categoryId: jobData.categoryId || null,
            deadline: jobData.deadline ? new Date(jobData.deadline) : null,
            attachments: jobData.attachments || null,
            status: "ACTIVE"
        },
        include: {
            category: true,
            client: {
                select: {
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                    city: true
                }
            },
            _count: { select: { bids: true } }
        }
    });
};

/**
 * Get all jobs (with optional filters)
 */
export const getAllJobs = async (filters = {}) => {
    const { categoryId, status, search } = filters;
    return await prisma.job.findMany({
        where: {
            ...(categoryId && { categoryId }),
            ...(status ? { status } : { status: "ACTIVE" }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } }
                ]
            })
        },
        include: {
            client: {
                select: {
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                    city: true
                }
            },
            category: true,
            _count: { select: { bids: true } }
        },
        orderBy: { createdAt: "desc" }
    });
};

/**
 * Get job details with bids
 */
export const getJobById = async (id) => {
    return await prisma.job.findUnique({
        where: { id },
        include: {
            client: {
                select: {
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                    city: true,
                    country: true
                }
            },
            category: true,
            bids: {
                include: {
                    creator: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    profilePicture: true,
                                    city: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            },
            booking: true,
            _count: { select: { bids: true } }
        }
    });
};

/**
 * Get jobs posted by a specific client
 */
export const getClientJobs = async (clientId) => {
    return await prisma.job.findMany({
        where: { clientId },
        include: {
            category: true,
            booking: true,
            _count: { select: { bids: true } }
        },
        orderBy: { createdAt: "desc" }
    });
};

/**
 * Update a job request
 */
export const updateJob = async (id, clientId, updateData) => {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new Error("Job not found");
    if (job.clientId !== clientId) throw new Error("You can only edit your own jobs");

    return await prisma.job.update({
        where: { id },
        data: {
            ...(updateData.title && { title: updateData.title }),
            ...(updateData.description && { description: updateData.description }),
            ...(updateData.budget !== undefined && { budget: updateData.budget ? parseFloat(updateData.budget) : null }),
            ...(updateData.location !== undefined && { location: updateData.location }),
            ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId }),
            ...(updateData.deadline !== undefined && { deadline: updateData.deadline ? new Date(updateData.deadline) : null }),
            ...(updateData.status && { status: updateData.status })
        },
        include: {
            category: true,
            _count: { select: { bids: true } }
        }
    });
};

/**
 * Delete a job request
 */
export const deleteJob = async (id, clientId) => {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) throw new Error("Job not found");
    if (job.clientId !== clientId) throw new Error("You can only delete your own jobs");

    return await prisma.job.delete({ where: { id } });
};
