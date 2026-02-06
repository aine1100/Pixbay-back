import prisma from "../../prisma/client.js";
import { sendPushNotification } from "../../utils/notifications.js";

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

    // 2. Update Chat's last message
    await prisma.chat.update({
        where: { id: chatId },
        data: {
            lastMessage: {
                content: content,
                senderId: senderId,
                sentAt: new Date()
            },
            updatedAt: new Date()
        }
    });

    // 3. Trigger Push Notification to recipient
    // Find the other participant in the chat (via Booking relation)
    const chat = await prisma.chat.findUnique({
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

    if (chat) {
        const recipientId = senderId === chat.booking.clientId ? 
            chat.booking.creator.userId : chat.booking.clientId;
        
        await sendPushNotification(recipientId, {
            title: "New Message",
            body: typeof content === 'string' ? content : "You received a new file",
            data: { chatId, type: 'CHAT_MESSAGE' }
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
 * List user's active chats
 */
export const getUserChats = async (userId) => {
    return await prisma.chat.findMany({
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
                    client: { select: { firstName: true, lastName: true, profilePicture: true } },
                    creator: { include: { user: { select: { firstName: true, lastName: true, profilePicture: true } } } }
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
};
