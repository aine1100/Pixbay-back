import express from "express";
import {
    postJob,
    listJobs,
    getMyJobs,
    getJob,
    updateMyJob,
    deleteMyJob
} from "../../controller/job/jobController.js";
import {
    submitBid,
    getJobBids,
    getMyBids,
    updateBid,
    withdrawBid,
    acceptBid,
    rejectBid
} from "../../controller/job/bidController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";
import { cacheMiddleware } from "../../middleware/cache/cacheMiddleware.js";

const router = express.Router();

// ─── PUBLIC ROUTES ───────────────────────────
router.get("/", cacheMiddleware(300), listJobs);

// ─── PROTECTED ROUTES (must come before /:id to avoid conflicts) ───
router.use(protect);

// Static paths FIRST (before /:id)
router.post("/", postJob);
router.get("/my-jobs", getMyJobs);
router.get("/bids/my-bids", getMyBids);
router.put("/bids/:id", updateBid);
router.put("/bids/:id/withdraw", withdrawBid);
router.put("/bids/:id/accept", acceptBid);
router.put("/bids/:id/reject", rejectBid);

// Parameterized /:id routes LAST
router.get("/:id", getJob);
router.put("/:id", updateMyJob);
router.delete("/:id", deleteMyJob);

// Bid routes nested under job
router.post("/:jobId/bids", submitBid);
router.get("/:jobId/bids", getJobBids);

export default router;
