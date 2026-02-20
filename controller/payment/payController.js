import * as payService from "../../service/payment/payService.js";
import prisma from "../../prisma/client.js";

/**
 * Initialize a payment for a booking
 */
export const initialize = async (req, res) => {
    const { bookingId, type, ...details } = req.body;
    const userId = req.user.id;

    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { client: true }
        });

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        if (booking.clientId !== userId) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        if (booking.paymentStatus === "FULLY_PAID" || booking.paymentStatus === "PAID_IN_ESCROW") {
            return res.status(400).json({ success: false, message: "Booking already paid" });
        }

        let responseData;

        if (type === 'card') {
            responseData = await payService.chargeCard(booking, booking.client, details);
        } else if (type === 'momo') {
            responseData = await payService.chargeMomo(booking, booking.client, details);
        } else {
            // Default to Hosted Link if no specific type or 'hosted'
            const paymentData = await payService.initializePayment(booking, booking.client, details);
            if (paymentData.status === "success") {
                responseData = { paymentLink: paymentData.data.link };
            } else {
                throw new Error("Failed to initialize hosted payment");
            }
        }

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error("Initialize Payment Controller Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to initialize payment"
        });
    }
};

/**
 * Verify a transaction manually from frontend callback
 */
export const verify = async (req, res) => {
    const { transactionId } = req.query;

    if (!transactionId) {
        return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    try {
        const txData = await payService.verifyTransaction(transactionId);

        if (txData.status === "success") {
            // Find booking from meta or DB lookup
            let bookingId = txData.data?.meta?.bookingId;

            if (!bookingId && txData.data?.tx_ref) {
                const existingTx = await prisma.transaction.findUnique({
                    where: { transactionNumber: txData.data.tx_ref }
                });
                bookingId = existingTx?.bookingId;
            }

            if (bookingId) {
                const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

                if (booking && (booking.paymentStatus === "PENDING" || booking.paymentStatus === "DEPOSIT_PAID")) {
                    try {
                        await payService.finalizePayment(txData.data);
                    } catch (finalizeError) {
                        console.error("[Verify Controller] Finalization failed:", finalizeError.message);
                    }
                }
            }

            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                data: txData.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Payment verification failed",
                error: txData
            });
        }
    } catch (error) {
        console.error("Verify Payment Controller Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Validate a payment with OTP
 */
export const validate = async (req, res) => {
    const { transactionId, otp } = req.body;

    if (!transactionId || !otp) {
        return res.status(400).json({ success: false, message: "Transaction ID and OTP are required" });
    }

    try {
        console.info(`[Payment Controller] Validating OTP for flw_ref: ${transactionId}...`);
        const response = await payService.validateCharge(transactionId, otp);

        if (response.status === "success" && response.data?.status === "successful") {
            // OTP validated and charge is successful — finalize the payment
            console.info(`[Payment Controller] OTP validated. Finalizing payment for tx_ref: ${response.data.tx_ref}...`);

            try {
                await payService.finalizePayment(response.data);
                console.info(`[Payment Controller] ✅ Payment finalized successfully.`);
            } catch (finalizeError) {
                // Log the error but still return success to the user — money was charged
                // The webhook will retry finalization, or admin can reconcile
                console.error(`[Payment Controller] ❌ Finalization failed after successful charge:`, finalizeError.message);
            }

            return res.status(200).json({
                success: true,
                message: "Payment verified and processed successfully",
                data: response.data
            });
        } else if (response.status === "success") {
            // OTP validated but charge might still be pending
            return res.status(200).json({
                success: true,
                message: response.message || "OTP verified, payment processing",
                data: response.data
            });
        } else {
            return res.status(400).json({
                success: false,
                message: response.message || "OTP verification failed",
                data: response
            });
        }
    } catch (error) {
        console.error("Validate Payment Controller Error:", error.message);
        res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
};

/**
 * Handle Flutterwave Webhook
 */
export const handleWebhook = async (req, res) => {
    // Flutterwave secret hash verification recommended
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const signature = req.headers["verif-hash"];

    if (secretHash && signature !== secretHash) {
        return res.status(401).end();
    }

    const payload = req.body;

    // Acknowledge receipt immediately
    res.status(200).end();

    try {
        const txData = payload.data;
        if (payload.event === "charge.completed") {
            if (txData.status === "successful") {
                await payService.finalizePayment(txData);
                console.info(`[Webhook] Payment finalized for tx_ref: ${txData.tx_ref}`);
            } else if (txData.status === "failed") {
                await payService.failPayment(txData);
                console.warn(`[Webhook] Payment failed for tx_ref: ${txData.tx_ref}`);
            }
        }
    } catch (error) {
        console.error("Webhook Processing Error:", error);
    }
};

/**
 * Get payment history for a creator
 */
export const getCreatorPayments = async (req, res) => {
    const userId = req.user.id;

    try {
        // Find creator profile first
        const creator = await prisma.creator.findUnique({
            where: { userId }
        });

        if (!creator) {
            return res.status(404).json({ success: false, message: "Creator profile not found" });
        }

        const rawTransactions = await prisma.transaction.findMany({
            where: { creatorId: creator.id },
            include: {
                booking: {
                    select: {
                        bookingNumber: true,
                        category: true,
                        client: {
                            select: { firstName: true, lastName: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Deduplicate by bookingId, prioritizing more successful statuses
        const statusPriority = { 'COMPLETED': 3, 'PROCESSING': 2, 'PENDING': 1, 'FAILED': 0 };
        const transactionMap = new Map();

        rawTransactions.forEach(tx => {
            const bookingId = tx.bookingId;
            if (!bookingId) return; // Should not happen with current logic

            const existing = transactionMap.get(bookingId);
            if (!existing || statusPriority[tx.status] > statusPriority[existing.status]) {
                transactionMap.set(bookingId, tx);
            }
        });

        const transactions = Array.from(transactionMap.values()).sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error("Get Creator Payments Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
