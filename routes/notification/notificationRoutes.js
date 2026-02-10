import express from "express";
import * as notificationController from "../../controller/notification/notificationController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

router.get("/", notificationController.getMyNotifications);
router.patch("/read-all", notificationController.readAll);
router.patch("/:id/read", notificationController.readOne);
router.patch("/:id/archive", notificationController.archiveOne);
router.delete("/:id", notificationController.removeOne);

export default router;
