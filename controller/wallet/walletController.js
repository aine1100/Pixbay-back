import prisma from "../../prisma/client.js";
import * as walletService from "../../service/wallet/walletService.js";

export const getBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find creatorId for this user
        const creator = await prisma.creator.findUnique({
            where: { userId }
        });

        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator profile not found"
            });
        }

        const wallet = await walletService.getWalletByCreatorId(creator.id);
        res.status(200).json({
            success: true,
            data: wallet
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updatePayoutSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { method, details } = req.body;

        const creator = await prisma.creator.findUnique({
            where: { userId }
        });

        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator profile not found"
            });
        }

        const wallet = await walletService.updatePayoutSettings(creator.id, { method, details });
        res.status(200).json({
            success: true,
            message: "Payout settings updated successfully",
            data: wallet
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
