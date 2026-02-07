import express from "express";
import {
    getMyNotifications,
    readOne,
    readAll,
    archiveOne,
    removeOne
} from "../../controller/notification/notificationController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notification management
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notification history
 *     tags: [Notifications]
 */
router.get("/", getMyNotifications);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 */
router.patch("/read-all", readAll);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark single notification as read
 *     tags: [Notifications]
 */
router.patch("/:id/read", readOne);

/**
 * @swagger
 * /notifications/{id}/archive:
 *   patch:
 *     summary: Archive a notification
 *     tags: [Notifications]
 */
router.patch("/:id/archive", archiveOne);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 */
router.delete("/:id", removeOne);

export default router;
