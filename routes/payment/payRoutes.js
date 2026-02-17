import express from "express";
import * as payController from "../../controller/payment/payController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment integration with Flutterwave
 */

/**
 * @swagger
 * /payments/initialize:
 *   post:
 *     summary: Initialize a payment for a booking
 *     tags: [Payments]
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
 *             properties:
 *               bookingId:
 *                 type: string
 */
router.post("/initialize", protect, payController.initialize);

/**
 * @swagger
 * /payments/verify:
 *   get:
 *     summary: Verify a transaction manually
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/verify", payController.verify);

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Flutterwave webhook endpoint
 *     tags: [Payments]
 */
router.post("/webhook", payController.handleWebhook);

/**
 * @swagger
 * /payments/creator/history:
 *   get:
 *     summary: Get payment history for the logged-in creator
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get("/creator/history", protect, payController.getCreatorPayments);

export default router;
