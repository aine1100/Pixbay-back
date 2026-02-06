import * as chatService from "../../service/chat/chat.js";

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
        const { bookingId } = req.body;
        const chat = await chatService.getOrCreateChat(bookingId);
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
