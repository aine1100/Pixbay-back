import express from "express";
import {
    getMessages,
    listChats,
    initiateChat
} from "../../controller/chat/chatController.js";
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
 *     summary: List all active chats for current user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", listChats);

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

export default router;
