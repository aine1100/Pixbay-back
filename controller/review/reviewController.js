import * as reviewService from "../../service/review/review.js";

/**
 * Controller to create a new review
 */
export const create = async (req, res) => {
    try {
        const reviewerId = req.user.id;
        const reviewData = req.body; // { bookingId, rating, comment }

        if (!reviewData.bookingId || !reviewData.rating) {
            return res.status(400).json({
                success: false,
                message: "Booking ID and rating are required"
            });
        }

        const review = await reviewService.createReview(reviewerId, reviewData);

        res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            data: review
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
