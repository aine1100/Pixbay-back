import prisma from "../../prisma/client.js";
import { notificationQueue } from "../../utils/queue.js";

/**
 * Unified notification helper
 * Saves to DB and sends Push
 */
export const notifyUser = async (userId, data) => {
    const { type, title, message, metadata = {} } = data;

    // 1. Save to Database (In-App) — this always persists
    const notification = await prisma.notification.create({
        data: {
            userId,
            type,
            title,
            message,
            data: metadata
        }
    });

    // 2. Offload Push Notification to background queue (best-effort)
    try {
        await notificationQueue.add("sendPush", {
            userId,
            payload: {
                title,
                body: message,
                data: { ...metadata, notificationId: notification.id }
            }
        });
    } catch (error) {
        // Push failed but the in-app notification is already saved — don't rollback
        console.warn("[Notification Service] Push notification queue failed (in-app notification saved):", error.message);
    }

    return notification;
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
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset
    });
};

/**
 * Get count of unread notifications for a user
 */
export const getUnreadCount = async (userId) => {
    return await prisma.notification.count({
        where: { userId, isRead: false, isArchived: false }
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
