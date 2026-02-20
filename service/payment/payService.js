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
            payment_options: method === "card" ? "card" : "mobilemoneyrwanda,mobilemoneyuganda,mobilemoneyghana,mobilemoneyzambia,mobilemoneytanzania",
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
        const expiryParts = cardDetails.expiry.split("/");
        let expiryYear = expiryParts[1];
        // Flutterwave often expects 2-digit year (YY)
        if (expiryYear && expiryYear.length === 4) {
            expiryYear = expiryYear.substring(2);
        }

        const payload = {
            card_number: cardDetails.number.replace(/\s/g, ""),
            cvv: cardDetails.cvv,
            expiry_month: expiryParts[0],
            expiry_year: expiryYear,
            currency: booking.pricing.currency || "KES",
            amount: parseFloat(booking.pricing.totalAmount),
            email: user.email.split("_").slice(-1)[0].trim(),
            fullname: `${user.firstName} ${user.lastName}`,
            phone_number: user.phoneNumber || "0000000000",
            tx_ref: `PIXBAY-CARD-${Date.now()}-${booking.id.split("-")[0]}`,
            enckey: process.env.FLUTTERWAVE_ENCRYPTION_KEY
        };

        if (cardDetails.pin) {
            payload.authorization = {
                mode: "pin",
                pin: cardDetails.pin
            };
        }

        console.info(`[Payment Service] Initiating card charge for booking ${booking.id}...`);
        const response = await flw.Charge.card(payload);
        console.info("[Payment Service] Flutterwave Response:", JSON.stringify(response, null, 2));

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
            email: user.email.includes("_") ? user.email.split("_").slice(-1)[0].trim() : user.email.trim(),
            phone_number: momoDetails.phoneNumber,
            fullname: `${user.firstName} ${user.lastName}`,
            network: momoDetails.network || "MTN",
            order_id: booking.bookingNumber
        };

        // Dynamically call the correct SDK method based on the currency/region
        let response;
        if (payload.currency === "UGX") {
            response = await flw.MobileMoney.uganda(payload);
        } else if (payload.currency === "GHS") {
            response = await flw.MobileMoney.ghana(payload);
        } else if (payload.currency === "ZMW") {
            response = await flw.MobileMoney.zambia(payload);
        } else if (payload.currency === "TZS") {
            response = await flw.MobileMoney.tanzania(payload);
        } else {
            // Default to Rwanda as it's the primary market
            response = await flw.MobileMoney.rwanda(payload);
        }

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
    const txRef = txData.tx_ref;

    if (!txRef) {
        console.error("[Payment Service] No tx_ref found in transaction data", txData);
        throw new Error("Invalid transaction data: missing tx_ref");
    }

    try {
        // Find booking ID from meta, or customer meta, or fallback to database lookup
        let bookingId = txData.meta?.bookingId || txData.customer?.meta?.bookingId;

        if (!bookingId) {
            console.warn(`[Payment Service] No bookingId in txData, looking up transaction ${txRef} in DB...`);
            const existingTx = await prisma.transaction.findUnique({
                where: { transactionNumber: txRef }
            });
            bookingId = existingTx?.bookingId;
        }

        if (!bookingId) {
            throw new Error(`Could not determine bookingId for transaction ${txRef}`);
        }

        console.info(`[Payment Service] Finalizing payment for booking ${bookingId} (TX: ${txRef})...`);

        // Get the booking first to calculate commission
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { creator: true }
        });

        if (!booking) {
            throw new Error(`Booking ${bookingId} not found`);
        }

        // Check if already finalized (idempotency guard)
        if (booking.paymentStatus === "PAID_IN_ESCROW" || booking.paymentStatus === "FULLY_PAID") {
            console.info(`[Payment Service] Booking ${bookingId} already finalized (status: ${booking.paymentStatus}). Skipping.`);
            return { success: true, alreadyFinalized: true };
        }

        const totalAmount = parseFloat(booking.pricing?.totalAmount || 0);
        const platformFee = Math.round(totalAmount * 0.05 * 100) / 100; // 5% platform fee
        // Deduct Flutterwave's transaction fee — from txData.app_fee or estimate 1.5%
        const transactionFee = Math.round(parseFloat(txData.app_fee || 0) * 100) / 100
            || Math.round(totalAmount * 0.015 * 100) / 100;
        const creatorAmount = Math.round((totalAmount - platformFee - transactionFee) * 100) / 100;

        console.info(`[Payment Service] Commission: total=${totalAmount}, platformFee=${platformFee}, txFee=${transactionFee}, creatorAmount=${creatorAmount}`);

        // ---- ATOMIC DB TRANSACTION ----
        // Use interactive transaction for better error handling
        const [updatedTx, updatedBooking] = await prisma.$transaction(async (tx) => {
            // 1. Update Transaction record
            console.info(`[Payment Service] Step 1: Updating transaction record ${txRef}...`);
            const txRecord = await tx.transaction.update({
                where: { transactionNumber: txRef },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    metadata: txData
                },
                include: { user: true }
            });

            // 2. Update Booking (Status + PaymentStatus + Fees)
            console.info(`[Payment Service] Step 2: Updating booking ${bookingId}...`);
            const bookingRecord = await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: "CONFIRMED",
                    paymentStatus: "PAID_IN_ESCROW",
                    escrowStatus: "HELD",
                    pricing: {
                        ...(booking.pricing || {}),
                        platformFee,
                        transactionFee,
                        creatorAmount
                    }
                },
                include: { creator: true }
            });

            // 3. Add to creator's pending balance — use UPSERT to handle missing wallets
            console.info(`[Payment Service] Step 3: Updating wallet for creator ${booking.creatorId}...`);
            await tx.wallet.upsert({
                where: { creatorId: booking.creatorId },
                update: {
                    pendingBalance: { increment: creatorAmount }
                },
                create: {
                    creatorId: booking.creatorId,
                    pendingBalance: creatorAmount,
                    balance: 0,
                    currency: booking.pricing?.currency || "KES"
                }
            });

            console.info(`[Payment Service] ✅ Atomic transaction committed for booking ${bookingId}`);
            return [txRecord, bookingRecord];
        });

        // ---- NON-CRITICAL: Notifications & Socket (failures here won't rollback the payment) ----
        try {
            await notifyUser(updatedTx.userId, {
                type: "PAYMENT",
                title: "Payment Successful!",
                message: `Your payment for booking ${updatedBooking.bookingNumber} has been confirmed.`,
                metadata: { bookingId: updatedBooking.id, transactionId: updatedTx.id, subType: "PAYMENT_SUCCESS" }
            });

            await notifyUser(updatedBooking.creator.userId, {
                type: "PAYMENT",
                title: "Payment Received!",
                message: `You have received a payment for booking ${updatedBooking.bookingNumber}.`,
                metadata: { bookingId: updatedBooking.id, transactionId: updatedTx.id, subType: "PAYMENT_RECEIVED" }
            });
        } catch (notifyErr) {
            console.warn("[Payment Service] Notification failed (non-critical):", notifyErr.message);
        }

        try {
            const io = getIo();
            io.to(`user_${updatedTx.userId}`).emit("payment_completed", {
                bookingId: updatedBooking.id,
                status: "FULLY_PAID",
                message: "Payment Successful!"
            });
        } catch (socketErr) {
            console.warn("[Payment Service] Socket emit failed (non-critical):", socketErr.message);
        }

        console.info(`[Payment Service] ✅ Payment fully finalized for booking ${bookingId}`);
        return { success: true };
    } catch (error) {
        console.error("[Payment Service] ❌ Finalize Payment Error:", error.message);
        console.error("[Payment Service] Full error:", error);
        throw error;
    }
};

/**
 * Validate a charge with OTP
 */
export const validateCharge = async (flw_ref, otp) => {
    try {
        const payload = {
            otp,
            flw_ref
        };

        console.info(`[Payment Service] Validating charge for flw_ref: ${flw_ref}...`);
        const response = await flw.Charge.validate(payload);
        console.info("[Payment Service] Validation Response:", JSON.stringify(response, null, 2));

        return response;
    } catch (error) {
        console.error("Validate Charge Service Error:", error);
        throw error;
    }
};

/**
 * Handle failed payment
 */
export const failPayment = async (txData) => {
    const txRef = txData?.tx_ref;
    if (!txRef) {
        console.error("[Payment Service] failPayment called without tx_ref", txData);
        return { success: false, message: "No tx_ref" };
    }

    try {
        const updatedTx = await prisma.transaction.update({
            where: { transactionNumber: txRef },
            data: {
                status: "FAILED",
                metadata: txData
            }
        });

        // Notify client of failure
        await notifyUser(updatedTx.userId, {
            type: "PAYMENT",
            title: "Payment Failed",
            message: `Your payment for transaction ${txRef} could not be processed.`,
            metadata: { transactionId: updatedTx.id, subType: "PAYMENT_FAILED" }
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
