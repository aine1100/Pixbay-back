import express from "express";
import * as walletController from "../../controller/wallet/walletController.js";
import { protect, restrictTo } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

// All wallet routes require authentication and CREATOR role
router.use(protect);
router.use(restrictTo("CREATOR"));

router.get("/balance", walletController.getBalance);
router.patch("/payout-settings", walletController.updatePayoutSettings);

export default router;
