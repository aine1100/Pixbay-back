import * as notificationService from "../../service/notification/notification.js";

export const getMyNotifications = async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const notifications = await notificationService.getUserNotifications(
            req.user.id,
            limit ? parseInt(limit) : 20,
            offset ? parseInt(offset) : 0
        );
        res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const readOne = async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: "Notification marked as read"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const readAll = async (req, res) => {
    try {
        await notificationService.markAllRead(req.user.id);
        res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const archiveOne = async (req, res) => {
    try {
        await notificationService.archiveNotification(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: "Notification archived"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const removeOne = async (req, res) => {
    try {
        await notificationService.deleteNotification(req.params.id, req.user.id);
        res.status(200).json({
            success: true,
            message: "Notification deleted"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
