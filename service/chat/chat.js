import prisma from "../../prisma/client.js";
import { notifyUser } from "../notification/notification.js";

/**
 * Get message history for a chat
 */
export const getChatMessages = async (chatId, limit = 50, offset = 0) => {
    return await prisma.message.findMany({
        where: { chatId },
        orderBy: { sentAt: "desc" },
        take: limit,
        skip: offset,
        include: {
            sender: {
                select: {
                    firstName: true,
                    lastName: true,
                    profilePicture: true,
                    role: true
                }
            }
        }
    });
};

/**
 * Persist a new message and trigger notification
 */
export const saveMessage = async (chatId, senderId, senderType, content, messageType = "TEXT") => {
    let message;
    try {
        // 1. Save to database
        message = await prisma.message.create({
            data: {
                chatId,
                senderId,
                senderType,
                messageType,
                content
            }
        });

        // 2. Update Chat's last message and increment unread count for the other person
        const chatData = await prisma.chat.findUnique({
            where: { id: chatId }
        });

        if (chatData) {
            const recipientId = senderId === chatData.user1Id ? chatData.user2Id : chatData.user1Id;
            const currentUnread = (chatData.unreadCount || { client: 0, creator: 0 });

            // We still use 'client' and 'creator' in unreadCount for backward compatibility with UI if needed,
            // but let's make it more generic: { [userId]: count }
            if (!currentUnread[recipientId]) {
                currentUnread[recipientId] = 0;
            }
            currentUnread[recipientId] += 1;

            await prisma.chat.update({
                where: { id: chatId },
                data: {
                    lastMessage: {
                        content: content,
                        senderId: senderId,
                        sentAt: new Date(),
                        messageType: messageType
                    },
                    unreadCount: currentUnread,
                    updatedAt: new Date()
                }
            });

            // 3. Trigger Push Notification to recipient
            await notifyUser(recipientId, {
                type: "MESSAGE",
                title: "New Message",
                message: messageType === "TEXT" ? (typeof content === "string" ? content : "New message") : `Sent a ${messageType.toLowerCase()}`,
                metadata: { chatId, type: "CHAT_MESSAGE" }
            });
        }

        return message;
    } catch (error) {
        if (message?.id) {
            await prisma.message.delete({ where: { id: message.id } }).catch(() => { });
        }
        throw error;
    }
};

/**
 * Get or Create Chat for a booking or between two users
 */
export const getOrCreateChat = async (userIds, bookingId = null) => {
    if (!Array.isArray(userIds) || userIds.length !== 2) {
        throw new Error("Chat requires exactly 2 participants");
    }

    // Sort to ensure uniqueness (user1Id < user2Id)
    const [u1, u2] = [...userIds].sort();

    let chat = await prisma.chat.findFirst({
        where: {
            user1Id: u1,
            user2Id: u2,
            bookingId: bookingId // If bookingId is provided, we might want a specific chat for it, 
                                // but the prompt says "enable user to talk with different people",
                                // implying general chat. For now, 1:1 general chat is unique per pair.
        }
    });

    if (!chat) {
        chat = await prisma.chat.create({
            data: {
                user1Id: u1,
                user2Id: u2,
                bookingId,
                isActive: true,
                unreadCount: { [u1]: 0, [u2]: 0 }
            }
        });
    }

    return chat;
};

/**
 * List user's active chats (Inbox)
 */
export const getUserChats = async (userId) => {
    const chats = await prisma.chat.findMany({
        where: {
            OR: [
                { user1Id: userId },
                { user2Id: userId }
            ]
        },
        include: {
            user1: { select: { id: true, firstName: true, lastName: true, profilePicture: true, role: true } },
            user2: { select: { id: true, firstName: true, lastName: true, profilePicture: true, role: true } },
            booking: {
                select: {
                    id: true,
                    bookingNumber: true,
                    status: true
                }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    return chats.map(chat => {
        const otherUser = chat.user1Id === userId ? chat.user2 : chat.user1;
        const unreadCount = (chat.unreadCount || {})[userId] || 0;

        return {
            id: chat.id,
            bookingId: chat.bookingId,
            booking: chat.booking,
            otherUser,
            lastMessage: chat.lastMessage,
            unreadCount,
            updatedAt: chat.updatedAt
        };
    });
};

/**
 * Mark messages as read and reset unread count
 */
export const markChatAsRead = async (chatId, userId) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId }
    });

    if (!chat) throw new Error("Chat not found");

    const currentUnread = chat.unreadCount || {};
    currentUnread[userId] = 0;

    // 1. Reset chat unread count
    await prisma.chat.update({
        where: { id: chatId },
        data: { unreadCount: currentUnread }
    });

    // 2. Mark all messages from other user as READ
    await prisma.message.updateMany({
        where: {
            chatId,
            senderId: { not: userId },
            status: { not: "READ" }
        },
        data: {
            status: "READ",
            readAt: new Date()
        }
    });

    return { success: true };
};

/**
 * Get total unread messages count for a user across all active chats
 */
export const getTotalUnreadCount = async (userId) => {
    const chats = await prisma.chat.findMany({
        where: {
            isActive: true,
            OR: [
                { user1Id: userId },
                { user2Id: userId }
            ]
        },
        select: {
            unreadCount: true
        }
    });

    return chats.reduce((total, chat) => {
        const count = (chat.unreadCount || {})[userId] || 0;
        return total + count;
    }, 0);
};
