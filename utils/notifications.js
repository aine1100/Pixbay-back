import admin from "./firebase.js";
import prisma from "../prisma/client.js";
import { createBreaker } from "./circuitBreaker.js";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

/**
 * Send a push notification to a specific user
 * @param {string} userId - ID of the recipient
 * @param {Object} payload - { title, body, data }
 */
const _sendPushNotification = async (userId, payload) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true }
    });

    if (!user || !user.fcmToken) {
        console.log(`User ${userId} has no FCM token. Skipping push notification.`);
        return;
    }

    const message = {
        notification: {
            title: payload.title,
            body: payload.body
        },
        data: payload.data || {},
        token: user.fcmToken
    };

    if (serviceAccount) {
        const response = await admin.messaging().send(message);
        console.log("Successfully sent push notification:", response);
        return response;
    } else {
        console.log("SIMULATED PUSH NOTIFICATION:", message);
        return { messageId: "simulated-id" };
    }
};

const pushBreaker = createBreaker(_sendPushNotification, "Push Notification Service (Firebase)");

export const sendPushNotification = (userId, payload) => pushBreaker.fire(userId, payload);

/**
 * Update user's FCM token
 */
export const updateFcmToken = async (userId, fcmToken) => {
    return await prisma.user.update({
        where: { id: userId },
        data: { fcmToken }
    });
};
