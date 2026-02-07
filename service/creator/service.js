import prisma from "../../prisma/client.js";

/**
 * Add a new service to a creator's profile
 * In the simplified schema, pricing is a JSON field in Creator model, 
 * but we can also store specific services if we add a Service model or 
 * just update the pricing JSON.
 * 
 * Looking at the schema, there isn't a separate Service model yet, 
 * but there is a ServiceType enum. Let's create a Service model if it helps,
 * or manage it within the Creator's pricing JSON as per the schema comment.
 * 
 * Schema L175: pricing Json? // { hourlyRate, packages, customPricingEnabled }
 */

export const updatePricing = async (userId, pricingData) => {
    return await prisma.creator.update({
        where: { userId },
        data: {
            pricing: pricingData
        }
    });
};

/**
 * Get a creator's public profile including portfolio and categories
 */
export const getPublicProfile = async (creatorIdOrUserId) => {
    return await prisma.creator.findFirst({
        where: {
            OR: [
                { id: creatorIdOrUserId },
                { userId: creatorIdOrUserId }
            ]
        },
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                    city: true,
                    country: true
                }
            },
            portfolioMedia: true,
            // Categories are often linked via bio or specializations in this schema
        }
    });
};

/**
 * List all creators by category or type
 */
export const listCreators = async (filters = {}) => {
    const { type, city, country } = filters;

    return await prisma.creator.findMany({
        where: {
            verificationStatus: 'APPROVED', // Only show verified creators publicly
            ...(type && { creatorType: type }),
            ...(city && { user: { city: city } }), // In User model
            ...(country && { user: { country: country } })
        },
        select: {
            id: true,
            creatorType: true,
            bio: true,
            pricing: true,
            verificationStatus: true,
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                    city: true,
                    country: true
                }
            },
            portfolioMedia: {
                take: 3, // Show a few preview items
                select: { url: true, type: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};
