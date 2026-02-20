import express from "express";
import {
    create,
    list,
    getOne,
    updateStatus,
    remove,
    checkIn,
    uploadDelivery,
    confirmDelivery
} from "../../controller/booking/bookingController.js";
import { uploadPortfolioMedia } from "../../utils/upload.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

// All booking routes are protected
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking management for clients and creators
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: List user's bookings (as client or creator)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get("/", list);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - creatorId
 *               - serviceType
 *               - bookingDetails
 *               - pricing
 *             properties:
 *               creatorId:
 *                 type: string
 *               serviceType:
 *                 type: string
 *                 enum: [SINGLE_SESSION, MULTI_SESSION, PROJECT_BASED]
 *               category:
 *                 type: string
 *               bookingDetails:
 *                 type: object
 *               pricing:
 *                 type: object
 *     responses:
 *       201:
 *         description: Booking created
 */
router.post("/", create);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get booking details
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details
 */
router.get("/:id", getOne);

/**
 * @swagger
 * /bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/:id/status", updateStatus);

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     summary: Delete a booking (Only PENDING/CANCELLED and if owner)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking deleted
 */
router.delete("/:id", remove);

/**
 * @swagger
 * /bookings/{id}/check-in:
 *   post:
 *     summary: Register a check-in for a booking session
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionNumber
 *               - location
 *             properties:
 *               sessionNumber:
 *                 type: integer
 *               location:
 *                 type: object
 *     responses:
 *       200:
 *         description: Check-in successful
 */
router.post("/:id/check-in", checkIn);

/**
 * @swagger
 * /bookings/{id}/confirm-delivery:
 *   post:
 *     summary: Confirm delivery and release escrowed funds to creator
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery confirmed and funds released
 */
router.post("/:id/confirm-delivery", confirmDelivery);

/**
 * @swagger
 * /bookings/{id}/delivery:
 *   post:
 *     summary: Upload delivery media for a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               delivery:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               links:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 */
router.post("/:id/delivery", uploadPortfolioMedia.fields([{ name: "delivery", maxCount: 10 }]), uploadDelivery);

export default router;
