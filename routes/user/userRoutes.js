import express from "express";
import {
    getProfile,
    updateProfile,
    listUsers,
    deactivate,
    activate,
    removeUser,
    changeRole,
    getMe,
    updateMe,
    getSessions,
    updateFcmToken,
    toggleFavorite,
    getFavorites,
    revokeSession
} from "../../controller/user/userController.js";
import { protect, restrictTo } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

// All routes below this line are protected
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and management
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get("/", restrictTo("ADMIN"), listUsers);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
router.get("/me", getMe);

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/me", updateMe);

/**
 * @swagger
 * /users/me/sessions:
 *   get:
 *     summary: Get all active sessions for current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 */
router.get("/me/sessions", getSessions);
router.delete("/me/sessions/:sessionId", revokeSession);

/**
 * @swagger
 * /users/fcm-token:
 *   patch:
 *     summary: Update FCM token for push notifications
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fcmToken:
 *                 type: string
 */
router.patch("/fcm-token", updateFcmToken);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile data
 *       404:
 *         description: User not found
 */
router.get("/:userId", getProfile);

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put("/:userId", updateProfile);

/**
 * @swagger
 * /users/{userId}/deactivate:
 *   patch:
 *     summary: Deactivate user account (soft delete)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 */
router.patch("/:userId/deactivate", restrictTo("ADMIN"), deactivate);

/**
 * @swagger
 * /users/{userId}/activate:
 *   patch:
 *     summary: Activate user account
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activated successfully
 */
router.patch("/:userId/activate", restrictTo("ADMIN"), activate);

/**
 * @swagger
 * /users/{userId}/role:
 *   patch:
 *     summary: Update user role
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [CLIENT, CREATOR, ADMIN]
 *     responses:
 *       200:
 *         description: User role updated successfully
 */
router.patch("/:userId/role", restrictTo("ADMIN"), changeRole);

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete user permanently
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted permanently
 */
router.delete("/:userId", restrictTo("ADMIN"), removeUser);

/**
 * @swagger
 * /users/me/saved-creators:
 *   get:
 *     summary: Get all saved creators
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved creators
 */
router.get("/me/saved-creators", getFavorites);

/**
 * @swagger
 * /users/me/saved-creators/{creatorId}:
 *   post:
 *     summary: Toggle saving a creator
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: creatorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Toggled successfully
 */
router.post("/me/saved-creators/:creatorId", toggleFavorite);

export default router;
