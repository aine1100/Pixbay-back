import prisma from "../../prisma/client.js";

/**
 * Create a new review for a completed booking
 * @param {string} reviewerId - ID of the user giving the review (client)
 * @param {Object} reviewData - { bookingId, rating, comment }
 */
export const createReview = async (reviewerId, reviewData) => {
    const { bookingId, rating, comment } = reviewData;

    // 1. Fetch booking with creator info
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            creator: true
        }
    });

    if (!booking) {
        throw new Error("Booking not found");
    }

    // 2. Validate booking status and ownership
    const allowedStatuses = ["CONFIRMED", "COMPLETED"];
    if (!allowedStatuses.includes(booking.status)) {
        throw new Error("Reviews can only be left for confirmed or completed bookings");
    }

    if (booking.clientId !== reviewerId) {
        throw new Error("You are not authorized to review this booking");
    }

    // 3. Duplicate check removed to allow multiple reviews per person for the same booking

    // 4. Create review in a transaction to ensure creator stats are updated
    const result = await prisma.$transaction(async (tx) => {
        // Create the review
        const review = await tx.review.create({
            data: {
                bookingId,
                reviewerId,
                revieweeId: booking.creator.userId,
                reviewerType: "CLIENT",
                rating: parseInt(rating),
                comment,
            }
        });

        // Fetch all reviews for this creator to recalculate stats
        const allReviews = await tx.review.findMany({
            where: { revieweeId: booking.creator.userId }
        });

        const totalReviews = allReviews.length;
        const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
        const averageRating = totalRating / totalReviews;

        // Calculate breakdown
        const breakdown = {
            1: allReviews.filter(r => r.rating === 1).length,
            2: allReviews.filter(r => r.rating === 2).length,
            3: allReviews.filter(r => r.rating === 3).length,
            4: allReviews.filter(r => r.rating === 4).length,
            5: allReviews.filter(r => r.rating === 5).length,
        };

        // Update creator profile
        await tx.creator.update({
            where: { id: booking.creatorId },
            data: {
                averageRating: averageRating,
                totalReviews: totalReviews,
                ratingBreakdown: breakdown
            }
        });

        return review;
    });

    return result;
};
