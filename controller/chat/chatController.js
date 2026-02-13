import * as chatService from "../../service/chat/chat.js";
import { uploadFile } from "../../utils/supabase.js";
import prisma from "../../prisma/client.js";
import { getIo } from "../../utils/socket.js";

export const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { limit, offset } = req.query;
        const messages = await chatService.getChatMessages(chatId, parseInt(limit), parseInt(offset));
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const listChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const chats = await chatService.getUserChats(userId);
        res.status(200).json({
            success: true,
            data: chats
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const initiateChat = async (req, res) => {
    try {
        const { bookingId, recipientId } = req.body;
        const senderId = req.user.id;

        if (!bookingId && !recipientId) {
            return res.status(400).json({
                success: false,
                message: "Either bookingId or recipientId is required"
            });
        }

        let userIds;
        if (bookingId) {
            const booking = await prisma.booking.findUnique({
                where: { id: bookingId },
                include: { creator: true }
            });
            if (!booking) throw new Error("Booking not found");
            userIds = [booking.clientId, booking.creator.userId];
        } else {
            // Safety check: if recipientId is a creatorId, map it to userId
            let finalRecipientId = recipientId;
            const creator = await prisma.creator.findUnique({
                where: { id: recipientId }
            });
            if (creator) {
                finalRecipientId = creator.userId;
            }
            userIds = [senderId, finalRecipientId];
        }

        const chat = await chatService.getOrCreateChat(userIds, bookingId);
        res.status(201).json({
            success: true,
            data: chat
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const result = await chatService.markChatAsRead(chatId, req.user.id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const totalUnread = async (req, res) => {
    try {
        const count = await chatService.getTotalUnreadCount(req.user.id);
        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const uploadDocument = async (req, res) => {
    try {
        const { chatId } = req.params;
        const senderId = req.user.id;
        const senderType = req.user.role;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "No file provided"
            });
        }

        // Upload to Supabase
        const fileName = `${Date.now()}-${file.originalname}`;
        const path = `chats/${chatId}/${fileName}`;
        const publicUrl = await uploadFile(path, file.buffer, undefined, {
            contentType: file.mimetype
        });

        // Save message with document metadata
        const message = await chatService.saveMessage(
            chatId,
            senderId,
            senderType,
            {
                url: publicUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype
            },
            "DOCUMENT"
        );

        res.status(201).json({
            success: true,
            data: message
        });

        // Emit via socket so the file message appears in real-time
        try {
            const io = getIo();
            io.to(`chat_${chatId}`).emit("receive_message", message);
        } catch (e) {
            console.log(e);
            // socket emit is best-effort
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
