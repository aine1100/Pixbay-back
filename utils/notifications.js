import admin from "firebase-admin";
import dotenv from "dotenv";
import prisma from "../prisma/client.js";
import { createBreaker } from "./circuitBreaker.js";

dotenv.config();

// Placeholder for Firebase Service Account
// In a real scenario, the user would provide this JSON or path to it
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? 
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Connected to firebase");
} else {
    console.warn("Firebase Service Account is missing. Push notifications will be simulated (logged to console).");
}

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
