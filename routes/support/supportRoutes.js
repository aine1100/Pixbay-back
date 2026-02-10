import express from "express";
import * as supportController from "../../controller/support/supportController.js";
import { protect, restrictTo } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /support:
 *   post:
 *     summary: Submit a support ticket
 *     tags: [Support]
 */
router.post("/", (req, res, next) => {
    // Optional authentication: if token provided, verify it, otherwise proceed as guest
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        return protect(req, res, next);
    }
    next();
}, supportController.submitTicket);

/**
 * @swagger
 * /support/me:
 *   get:
 *     summary: Get current user's tickets
 *     tags: [Support]
 */
router.get("/me", protect, supportController.getMyTickets);

/**
 * @swagger
 * /support/admin:
 *   get:
 *     summary: List all tickets (Admin only)
 *     tags: [Support]
 */
router.get("/admin", protect, restrictTo("ADMIN"), supportController.listTickets);

/**
 * @swagger
 * /support/admin/:ticketId:
 *   patch:
 *     summary: Update ticket status (Admin only)
 *     tags: [Support]
 */
router.patch("/admin/:ticketId", protect, restrictTo("ADMIN"), supportController.updateStatus);

export default router;
