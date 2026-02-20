import prisma from "../../prisma/client.js";

/**
 * Initialize a wallet for a creator if it doesn't exist
 * @param {string} creatorId 
 */
export const initWallet = async (creatorId) => {
    const existing = await prisma.wallet.findUnique({
        where: { creatorId }
    });

    if (existing) return existing;

    return await prisma.wallet.create({
        data: {
            creatorId,
            balance: 0,
            pendingBalance: 0,
            currency: "KES"
        }
    });
};

/**
 * Get wallet for a creator
 * @param {string} creatorId 
 */
export const getWalletByCreatorId = async (creatorId) => {
    let wallet = await prisma.wallet.findUnique({
        where: { creatorId }
    });

    if (!wallet) {
        wallet = await initWallet(creatorId);
    }
    return wallet;
};

/**
 * Add funds to pending balance (when payment is made to escrow)
 * @param {string} creatorId 
 * @param {number} amount - The amount to add to pending
 */
export const addPendingFunds = async (creatorId, amount) => {
    return await prisma.wallet.update({
        where: { creatorId },
        data: {
            pendingBalance: {
                increment: amount
            }
        }
    });
};

/**
 * Release funds from pending to available balance (when delivery is confirmed)
 * @param {string} creatorId 
 * @param {number} amount - The amount to release
 */
export const releaseEscrowFunds = async (creatorId, amount) => {
    return await prisma.wallet.update({
        where: { creatorId },
        data: {
            pendingBalance: {
                decrement: amount
            },
            balance: {
                increment: amount
            }
        }
    });
};

/**
 * Update payout settings
 * @param {string} creatorId 
 * @param {Object} settings - { method, details }
 */
export const updatePayoutSettings = async (creatorId, settings) => {
    const { method, details } = settings;
    return await prisma.wallet.update({
        where: { creatorId },
        data: {
            payoutMethod: method,
            payoutDetails: details
        }
    });
};
