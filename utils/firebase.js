import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? 
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;

if (serviceAccount && admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Connected to firebase successfully");
} else if (!serviceAccount) {
    console.warn("Firebase Service Account is missing. Social login and push notifications will be simulated.");
}

export default admin;
