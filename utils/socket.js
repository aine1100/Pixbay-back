import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import * as chatService from "../service/chat/chat.js";

let io;
const onlineUsers = new Map(); // userId -> Set<socketId>

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true
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
        const userId = socket.user.id;
        console.log(`User connected: ${userId}`);

        // Join personal room for targeted notifications
        socket.join(`user_${userId}`);

        // Track online presence
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Broadcast that this user is online
        socket.broadcast.emit("user_online", { userId });

        // Send current online users list to the newly connected client
        socket.emit("online_users", Array.from(onlineUsers.keys()));

        // Client can request online users list at any time
        socket.on("get_online_users", () => {
            socket.emit("online_users", Array.from(onlineUsers.keys()));
        });

        // Join specific chat room
        socket.on("join_chat", (chatId) => {
            socket.join(`chat_${chatId}`);
            console.log(`User ${userId} joined room chat_${chatId}`);
        });

        // Handle sending messages
        socket.on("send_message", async (data) => {
            const { chatId, content, senderType } = data;

            try {
                // Save to database
                const savedMsg = await chatService.saveMessage(
                    chatId,
                    userId,
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

        socket.on("message_read", async (data) => {
            const { chatId } = data;
            try {
                await chatService.markChatAsRead(chatId, userId);
                socket.to(`chat_${chatId}`).emit("messages_marked_read", {
                    chatId,
                    userId
                });
            } catch (error) {
                console.error("Socket mark read error:", error);
            }
        });

        // Typing Indicators
        socket.on("typing", (data) => {
            const { chatId } = data;
            socket.to(`chat_${chatId}`).emit("user_typing", {
                userId,
                chatId
            });
        });

        socket.on("stop_typing", (data) => {
            const { chatId } = data;
            socket.to(`chat_${chatId}`).emit("user_stop_typing", {
                userId,
                chatId
            });
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId}`);

            // Remove this socket from the user's set
            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);
                    // Only broadcast offline if no more connections
                    socket.broadcast.emit("user_offline", { userId });
                }
            }
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};

export const getOnlineUsers = () => Array.from(onlineUsers.keys());
