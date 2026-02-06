import express from "express";
import {
    postJob,
    listJobs,
    getMyJobs,
    getJob,
    updateMyJob,
    deleteMyJob
} from "../../controller/job/jobController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job request management for clients
 */

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: List all active jobs
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get("/", listJobs);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get job details
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 */
router.get("/:id", getJob);

// Protected routes
router.use(protect);

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Post a new job request
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               location:
 *                 type: string
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Job posted
 */
router.post("/", postJob);

/**
 * @swagger
 * /jobs/my-jobs:
 *   get:
 *     summary: Get jobs posted by current user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's jobs
 */
router.get("/my-jobs", getMyJobs);

/**
 * @swagger
 * /jobs/{id}:
 *   put:
 *     summary: Update a job request
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job updated
 */
router.put("/:id", updateMyJob);

/**
 * @swagger
 * /jobs/{id}:
 *   delete:
 *     summary: Delete a job request
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted
 */
router.delete("/:id", deleteMyJob);

export default router;
