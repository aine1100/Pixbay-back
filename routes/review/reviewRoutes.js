import express from "express";
import { create } from "../../controller/review/reviewController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

// All review routes are protected
router.use(protect);

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a new review for a completed booking
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - rating
 *             properties:
 *               bookingId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Validation error or unauthorized
 */
router.post("/", create);

export default router;
