import express from "express";
import { 
    getAllUsers, 
    getCreators, 
    approveCreator,
    resolveDispute,
    getSummary
} from "../../controller/admin/adminController.js";
import { protect, restrictTo } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

// Diagnostic route
router.get("/status", (req, res) => res.status(200).json({ success: true, message: "Admin routes are reachable" }));

// All routes require Admin privileges
router.use(protect);
router.use(restrictTo("ADMIN"));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: System administration and management
 */

/**
 * @swagger
 * /admin/status:
 *   get:
 *     summary: Diagnostic route to check admin router health
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin router is working
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users (Admins only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [CLIENT, CREATOR, ADMIN] }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       email: { type: string }
 *                       firstName: { type: string }
 *                       lastName: { type: string }
 *                       role: { type: string }
 *                       isActive: { type: boolean }
 *                       createdAt: { type: string, format: date-time }
 *                       lastLoginAt: { type: string, format: date-time }
 */
router.get("/users", getAllUsers);

/**
 * @swagger
 * /admin/creators:
 *   get:
 *     summary: List all creators with filters (Admins only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED, SUSPENDED] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [PHOTOGRAPHER, VIDEO_CREATOR] }
 *     responses:
 *       200:
 *         description: List of creators retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       userId: { type: string }
 *                       verificationStatus: { type: string }
 *                       isVerified: { type: boolean }
 *                       user:
 *                         type: object
 *                         properties:
 *                           email: { type: string }
 *                           firstName: { type: string }
 *                           lastName: { type: string }
 *                           city: { type: string }
 *                           country: { type: string }
 */
router.get("/creators", getCreators);

/**
 * @swagger
 * /admin/creators/{creatorId}/verify:
 *   patch:
 *     summary: Manually verify/approve a creator (Admins only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: creatorId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [APPROVED, REJECTED, SUSPENDED] }
 *               verifiedBadge: { type: boolean }
 *     responses:
 *       200:
 *         description: Creator verification status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object }
 */
router.patch("/creators/:creatorId/verify", approveCreator);

/**
 * @swagger
 * /admin/disputes/{disputeId}/resolve:
 *   patch:
 *     summary: Resolve a dispute (Admins only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
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
 *               - resolution
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [RESOLVED, UNDER_REVIEW]
 *               resolution:
 *                 type: string
 *               refundAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Dispute resolved successfully
 */
router.patch("/disputes/:disputeId/resolve", resolveDispute);

/**
 * @swagger
 * /admin/summary:
 *   get:
 *     summary: Get platform-wide summary statistics (Admins only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform summary retrieved successfully
 */
router.get("/summary", getSummary);

export default router;
