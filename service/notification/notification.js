import prisma from "../../prisma/client.js";
import { sendPushNotification } from "../../utils/notifications.js";

/**
 * Unified notification helper
 * Saves to DB and sends Push
 */
export const notifyUser = async (userId, data) => {
    const { type, title, message, metadata = {} } = data;

    let notification;
    try {
        // 1. Save to Database (In-App)
        notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                data: metadata
            }
        });

        // 2. Send Push Notification
        await sendPushNotification(userId, {
            title,
            body: message,
            data: { ...metadata, notificationId: notification.id }
        });

        return notification;
    } catch (error) {
        // ROLLBACK: If notification was saved but Push failed, remove it
        if (notification?.id) {
            await prisma.notification.delete({ where: { id: notification.id } }).catch(e => console.error("Notification rollback failed:", e));
        }
        console.error("Notification Service Error:", error);
        throw error; // Propagate error for higher-level rollback (e.g., in saveMessage)
    }
};

/**
 * Get user's notifications (Excluding archived by default)
 */
export const getUserNotifications = async (userId, limit = 20, offset = 0, includeArchived = false) => {
    return await prisma.notification.findMany({
        where: {
            userId,
            ...(includeArchived ? {} : { isArchived: false })
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
    });
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id, userId) => {
    return await prisma.notification.update({
        where: { id, userId },
        data: {
            isRead: true,
            readAt: new Date()
        }
    });
};

/**
 * Mark all as read
 */
export const markAllRead = async (userId) => {
    return await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: {
            isRead: true,
            readAt: new Date()
        }
    });
};

/**
 * Archive a notification
 */
export const archiveNotification = async (id, userId) => {
    return await prisma.notification.update({
        where: { id, userId },
        data: { isArchived: true }
    });
};

/**
 * Delete a notification
 */
export const deleteNotification = async (id, userId) => {
    return await prisma.notification.delete({
        where: { id, userId }
    });
};
