import Flutterwave from "flutterwave-node-v3";
import prisma from "../../prisma/client.js";
import { notifyUser } from "../notification/notification.js";
import { getIo } from "../../utils/socket.js";

const flw = new Flutterwave(
    process.env.FLUTTERWAVE_PUBLIC_KEY,
    process.env.FLUTTERWAVE_SECRET_KEY
);

/**
 * Initialize a Flutterwave payment
 * @param {Object} booking - The booking object from database
 * @param {Object} user - The user object (client)
 * @returns {Promise<Object>} - Flutterwave response containing payment link
 */
export const initializePayment = async (booking, user, options = {}) => {
    const { method, phoneNumber } = options;
    try {
        const payload = {
            tx_ref: `PIXBAY-TX-${Date.now()}-${booking.id.split("-")[0]}`,
            amount: parseFloat(booking.pricing.totalAmount),
            currency: booking.pricing.currency || "KES",
            redirect_url: `${process.env.FRONTEND_URL}/client/payments/callback`,
            payment_options: method === 'card' ? 'card' : 'mobilemoneyrwanda,mobilemoneyuganda,mobilemoneyghana,mobilemoneyzambia,mobilemoneytanzania',
            meta: {
                bookingId: booking.id,
                clientId: user.id,
                creatorId: booking.creatorId
            },
            customer: {
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phonenumber: phoneNumber || user.phoneNumber || "0000000000"
            },
            customizations: {
                title: "Pixbay Creative Services",
                description: `Payment for booking #${booking.bookingNumber}`,
                logo: "https://pixbay.vercel.app/logo.png"
            }
        };

        // Use Fetch direct approach for v3 Standard (Hosted Link) as it's more reliable
        // Standard Checkout V3 Endpoint: https://api.flutterwave.com/v3/payments

        const res = await fetch("https://api.flutterwave.com/v3/payments", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.status === "success") {
            // Create a pending transaction in our DB
            await prisma.transaction.create({
                data: {
                    transactionNumber: payload.tx_ref,
                    bookingId: booking.id,
                    userId: user.id,
                    creatorId: booking.creatorId,
                    type: "PAYMENT",
                    amount: payload.amount,
                    currency: payload.currency,
                    status: "PENDING",
                    metadata: { flutterwave_ref: data.data.id }
                }
            });
        }

        return data;
    } catch (error) {
        console.error("Flutterwave Initialization Error:", error);
        throw error;
    }
};

/**
 * Charge a card directly
 */
export const chargeCard = async (booking, user, cardDetails) => {
    try {
        const payload = {
            card_number: cardDetails.number.replace(/\s/g, ""),
            cvv: cardDetails.cvv,
            expiry_month: cardDetails.expiry.split("/")[0],
            expiry_year: cardDetails.expiry.split("/")[1],
            currency: booking.pricing.currency || "KES",
            amount: parseFloat(booking.pricing.totalAmount),
            email: user.email,
            fullname: `${user.firstName} ${user.lastName}`,
            phone_number: user.phoneNumber || "0000000000",
            tx_ref: `PIXBAY-CARD-${Date.now()}-${booking.id.split("-")[0]}`,
            enckey: process.env.FLUTTERWAVE_ENCRYPTION_KEY
        };

        const response = await flw.Charge.card(payload);

        if (response.status === "success" || response.message === "Charge initiated") {
            await prisma.transaction.create({
                data: {
                    transactionNumber: payload.tx_ref,
                    bookingId: booking.id,
                    userId: user.id,
                    creatorId: booking.creatorId,
                    type: "PAYMENT",
                    amount: payload.amount,
                    currency: payload.currency,
                    status: "PENDING",
                    metadata: { flutterwave_ref: response.data?.id, mode: response.meta?.authorization?.mode }
                }
            });
        }
        return response;
    } catch (error) {
        console.error("Flutterwave Card Charge Error:", error);
        throw error;
    }
};

/**
 * Charge MoMo directly (Rwanda/Kenya/etc)
 */
export const chargeMomo = async (booking, user, momoDetails) => {
    try {
        const payload = {
            tx_ref: `PIXBAY-MOMO-${Date.now()}-${booking.id.split("-")[0]}`,
            amount: parseFloat(booking.pricing.totalAmount),
            currency: booking.pricing.currency || "RWF",
            email: user.email,
            phone_number: momoDetails.phoneNumber,
            fullname: `${user.firstName} ${user.lastName}`,
            network: momoDetails.network || "MTN",
            order_id: booking.bookingNumber
        };

        // Note: SDK method for momo depends on the country, for Rwanda:
        const response = await flw.MobileMoney.rwanda(payload);

        if (response.status === "success") {
            await prisma.transaction.create({
                data: {
                    transactionNumber: payload.tx_ref,
                    bookingId: booking.id,
                    userId: user.id,
                    creatorId: booking.creatorId,
                    type: "PAYMENT",
                    amount: payload.amount,
                    currency: payload.currency,
                    status: "PENDING",
                    metadata: { flutterwave_ref: response.data?.id }
                }
            });
        }
        return response;
    } catch (error) {
        console.error("Flutterwave MoMo Charge Error:", error);
        throw error;
    }
};

/**
 * Verify a transaction ID with Flutterwave
 * @param {string} transactionId - Flutterwave transaction ID
 * @returns {Promise<Object>} - Verification data
 */
export const verifyTransaction = async (transactionId) => {
    try {
        const response = await flw.Transaction.verify({ id: transactionId });
        return response;
    } catch (error) {
        console.error("Flutterwave Verification Error:", error);
        throw error;
    }
};

/**
 * Update booking and transaction after successful payment
 * @param {Object} txData - Verified transaction data from Flutterwave
 */
export const finalizePayment = async (txData) => {
    const bookingId = txData.meta.bookingId;
    const txRef = txData.tx_ref;

    try {
        const [updatedTx, updatedBooking] = await prisma.$transaction([
            // Update Transaction
            prisma.transaction.update({
                where: { transactionNumber: txRef },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    metadata: txData
                },
                include: { client: true, creator: { include: { user: true } } }
            }),
            // Update Booking
            prisma.booking.update({
                where: { id: bookingId },
                data: {
                    paymentStatus: "FULLY_PAID"
                }
            })
        ]);

        // 1. Notify Client
        await notifyUser(updatedTx.userId, {
            type: "PAYMENT_SUCCESS",
            title: "Payment Successful!",
            message: `Your payment for booking ${updatedBooking.bookingNumber} has been confirmed.`,
            metadata: { bookingId: updatedBooking.id, transactionId: updatedTx.id }
        });

        // 2. Notify Creator
        await notifyUser(updatedTx.creator.userId, {
            type: "PAYMENT_RECEIVED",
            title: "Payment Received!",
            message: `You have received a payment for booking ${updatedBooking.bookingNumber}.`,
            metadata: { bookingId: updatedBooking.id, transactionId: updatedTx.id }
        });

        // 3. Emit Socket Event to Client (Real-time UI refresh)
        try {
            const io = getIo();
            io.to(`user_${updatedTx.userId}`).emit("payment_completed", {
                bookingId: updatedBooking.id,
                status: "FULLY_PAID",
                message: "Payment Successful!"
            });
        } catch (socketErr) {
            console.warn("[Payment Service] Socket emit failed:", socketErr.message);
        }

        return { success: true };
    }catch(error){
        console.log("There was an error",error)
        
    }
}

/**
 * Handle failed payment
 */
export const failPayment = async (txData) => {
    const txRef = txData.tx_ref;
    try {
        const updatedTx = await prisma.transaction.update({
            where: { transactionNumber: txRef },
            // ...
            data: {
                status: "FAILED",
                metadata: txData
            }
        });

        // Notify client of failure
        await notifyUser(updatedTx.userId, {
            type: "PAYMENT_FAILED",
            title: "Payment Failed",
            message: `Your payment for transaction ${txRef} could not be processed.`,
            metadata: { transactionId: updatedTx.id }
        });

        // Emit Socket Event
        try {
            const io = getIo();
            io.to(`user_${updatedTx.userId}`).emit("payment_completed", {
                status: "FAILED",
                message: "Payment Failed!"
            });
        } catch (socketErr) {
            console.warn("[Payment Service] Socket emit failed:", socketErr.message);
        }

        return { success: true };
    } catch (error) {
        console.error("Fail Payment DB Error:", error);
        throw error;
    }
};
