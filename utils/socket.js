import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as chatService from "../service/chat/chat.js";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "*",
            methods: ["GET", "POST"]
        }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication error"));

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return next(new Error("Authentication error"));
            socket.user = decoded;
            next();
        });
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user.id}`);

        // Join specific chat room
        socket.on("join_chat", (chatId) => {
            socket.join(`chat_${chatId}`);
            console.log(`User ${socket.user.id} joined room chat_${chatId}`);
        });

        // Handle sending messages
        socket.on("send_message", async (data) => {
            const { chatId, content, senderType } = data;

            try {
                // Save to database
                const savedMsg = await chatService.saveMessage(
                    chatId,
                    socket.user.id,
                    senderType,
                    content
                );

                // Broadcast to room
                io.to(`chat_${chatId}`).emit("receive_message", savedMsg);
            } catch (error) {
                console.error("Socket save message error:", error);
                socket.emit("error", "Failed to send message");
            }
        });

        // Mark messages as read
        socket.on("message_read", async (data) => {
            const { chatId } = data;
            try {
                await chatService.markChatAsRead(chatId, socket.user.id);
                socket.to(`chat_${chatId}`).emit("messages_marked_read", { 
                    chatId, 
                    userId: socket.user.id 
                });
            } catch (error) {
                console.error("Socket mark read error:", error);
            }
        });

        // Typing Indicators
        socket.on("typing", (data) => {
            const { chatId } = data;
            socket.to(`chat_${chatId}`).emit("user_typing", {
                userId: socket.user.id,
                chatId
            });
        });

        socket.on("stop_typing", (data) => {
            const { chatId } = data;
            socket.to(`chat_${chatId}`).emit("user_stop_typing", {
                userId: socket.user.id,
                chatId
            });
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.user.id}`);
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};
