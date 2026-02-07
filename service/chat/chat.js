import prisma from "../../prisma/client.js";
import { notifyUser } from "../notification/notification.js";

/**
 * Get message history for a chat
 */
export const getChatMessages = async (chatId, limit = 50, offset = 0) => {
    return await prisma.message.findMany({
        where: { chatId },
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
            sender: {
                select: {
                    firstName: true,
                    lastName: true,
                    profilePicture: true
                }
            }
        }
    });
};

/**
 * Persist a new message and trigger notification
 */
export const saveMessage = async (chatId, senderId, senderType, content, messageType = 'TEXT') => {
    // 1. Save to database
    const message = await prisma.message.create({
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
        where: { id: chatId },
        include: {
            booking: {
                select: {
                    clientId: true,
                    creator: { select: { userId: true } }
                }
            }
        }
    });

    if (chatData) {
        const recipientType = senderId === chatData.booking.clientId ? 'CREATOR' : 'CLIENT';
        const currentUnread = (chatData.unreadCount || { client: 0, creator: 0 });
        
        if (recipientType === 'CREATOR') {
            currentUnread.creator += 1;
        } else {
            currentUnread.client += 1;
        }

        await prisma.chat.update({
            where: { id: chatId },
            data: {
                lastMessage: {
                    content: content,
                    senderId: senderId,
                    sentAt: new Date()
                },
                unreadCount: currentUnread,
                updatedAt: new Date()
            }
        });

        // 3. Trigger Push Notification to recipient
        const recipientId = senderId === chatData.booking.clientId ? 
            chatData.booking.creator.userId : chatData.booking.clientId;
        
        await notifyUser(recipientId, {
            type: 'MESSAGE',
            title: "New Message",
            body: typeof content === 'string' ? content : "You received a new file",
            metadata: { chatId, type: 'CHAT_MESSAGE' }
        });
    }

    return message;
};

/**
 * Get or Create Chat for a booking
 */
export const getOrCreateChat = async (bookingId) => {
    let chat = await prisma.chat.findUnique({
        where: { bookingId }
    });

    if (!chat) {
        chat = await prisma.chat.create({
            data: { 
                bookingId,
                isActive: true
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
            booking: {
                OR: [
                    { clientId: userId },
                    { creator: { userId } }
                ]
            }
        },
        include: {
            booking: {
                include: {
                    client: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
                    creator: { include: { user: { select: { id: true, firstName: true, lastName: true, profilePicture: true } } } }
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    // Format for easier consumption by frontend
    return chats.map(chat => {
        const isClient = chat.booking.clientId === userId;
        const otherUser = isClient ? chat.booking.creator.user : chat.booking.client;
        const unreadCount = chat.unreadCount || { client: 0, creator: 0 };
        
        return {
            id: chat.id,
            bookingId: chat.bookingId,
            otherUser,
            lastMessage: chat.lastMessage,
            unreadCount: isClient ? unreadCount.client : unreadCount.creator,
            updatedAt: chat.updatedAt
        };
    });
};

/**
 * Mark messages as read and reset unread count
 */
export const markChatAsRead = async (chatId, userId) => {
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { booking: true }
    });

    if (!chat) throw new Error("Chat not found");

    const isClient = chat.booking.clientId === userId;
    const currentUnread = chat.unreadCount || { client: 0, creator: 0 };

    if (isClient) {
        currentUnread.client = 0;
    } else {
        currentUnread.creator = 0;
    }

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
            status: { not: 'READ' }
        },
        data: {
            status: 'READ',
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
            isActive: true, // Only count active chats
            booking: {
                OR: [
                    { clientId: userId },
                    { creator: { userId } }
                ]
            }
        },
        select: {
            unreadCount: true,
            booking: {
                select: { clientId: true }
            }
        }
    });

    return chats.reduce((total, chat) => {
        const isClient = chat.booking.clientId === userId;
        const count = chat.unreadCount || { client: 0, creator: 0 };
        return total + (isClient ? count.client : count.creator);
    }, 0);
};
