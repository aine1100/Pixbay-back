import express from "express";
import { getStats } from "../../controller/dashboard/dashboardController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics and calendar events
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dashboard statistics and events
 */
router.get("/stats", getStats);

export default router;
