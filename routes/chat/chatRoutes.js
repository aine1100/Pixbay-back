import express from "express";
import {
    getMessages,
    listChats,
    initiateChat,
    markAsRead,
    totalUnread,
    uploadDocument
} from "../../controller/chat/chatController.js";
import { uploadAttachment } from "../../utils/upload.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time messaging and chat history
 */

/**
 * @swagger
 * /chats:
 *   get:
 *     summary: List all active chats for current user (Inbox)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", listChats);

/**
 * @swagger
 * /chats/unread-count:
 *   get:
 *     summary: Get total unread messages count across all active chats
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get("/unread-count", totalUnread);

/**
 * @swagger
 * /chats/initiate:
 *   post:
 *     summary: Start or get a chat for a booking
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 */
router.post("/initiate", initiateChat);

/**
 * @swagger
 * /chats/{chatId}/messages:
 *   get:
 *     summary: Get message history for a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 */
router.get("/:chatId/messages", getMessages);

/**
 * @swagger
 * /chats/{chatId}/read:
 *   patch:
 *     summary: Mark all messages in a chat as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 */
router.patch("/:chatId/read", markAsRead);

/**
 * @swagger
 * /chats/{chatId}/upload:
 *   post:
 *     summary: Upload a document/image to a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 */
router.post("/:chatId/upload", uploadAttachment.single("attachment"), uploadDocument);

export default router;
