import prisma from "../../prisma/client.js";

/**
 * Create a new job request
 */
export const createJob = async (clientId, jobData) => {
    return await prisma.job.create({
        data: {
            clientId,
            ...jobData
        }
    });
};

/**
 * Get all jobs (with optional filters)
 */
export const getAllJobs = async (filters = {}) => {
    const { categoryId, status } = filters;
    return await prisma.job.findMany({
        where: {
            ...(categoryId && { categoryId }),
            ...(status ? { status } : { status: "ACTIVE" }) // Default to active jobs
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
            category: true
        },
        orderBy: { createdAt: "desc" }
    });
};

/**
 * Get job details
 */
export const getJobById = async (id) => {
    return await prisma.job.findUnique({
        where: { id },
        include: {
            client: true,
            category: true
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
            category: true
        },
        orderBy: { createdAt: "desc" }
    });
};

/**
 * Update a job request
 */
export const updateJob = async (id, clientId, updateData) => {
    return await prisma.job.update({
        where: { id, clientId }, // Ensure only owner can update
        data: updateData
    });
};

/**
 * Delete a job request
 */
export const deleteJob = async (id, clientId) => {
    return await prisma.job.delete({
        where: { id, clientId }
    });
};
