import express from "express";
import multer from "multer";
import {
    activateIdentity,
    uploadPortfolio,
    updateEquipment,
    updateProfile
} from "../../controller/creator/creatorController.js";
import {
    updatePricing,
    getProfile,
    browseCreators
} from "../../controller/creator/serviceController.js";
import { protect } from "../../middleware/auth/authMiddleware.js";


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /creators:
 *   get:
 *     summary: Browse verified creators (Directory)
 *     description: Returns a list of creators with their profile previews, ratings, and portfolio samples.
 *     tags: [Creator Portal]
 *     parameters:
 *       - in: query
 *         name: type
 *         description: Filter by creator type (e.g., PHOTOGRAPHER, VIDEOGRAPHER)
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         description: Filter by city
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         description: Filter by country
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A rich list of verified creators
 */
router.get("/", browseCreators);

/**
 * @swagger
 * /creators/{id}:
 *   get:
 *     summary: Get public creator profile
 *     tags: [Creator Portal]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Creator profile details
 */
router.get("/profile/:id", getProfile);

// All routes below this line are protected
router.use(protect);

/**
 * @swagger
 * /creators/pricing:
 *   put:
 *     summary: Update creator pricing
 *     tags: [Creator Portal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pricing updated
 */
router.put("/pricing", updatePricing);

/**
 * @swagger
 * /creators/activate/step1:
 *   post:
 *     summary: Step 1 - Submit Identity Verification
 *     tags: [Creator Portal]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nationalId:
 *                 type: string
 *               country:
 *                 type: string
 *               idFront:
 *                 type: string
 *                 format: binary
 *               idBack:
 *                 type: string
 *                 format: binary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Identity documents submitted
 */
router.post(
    "/activate/step1",
    upload.fields([{ name: "idFront", maxCount: 1 }, { name: "idBack", maxCount: 1 }]),
    activateIdentity
);

/**
 * @swagger
 * /creators/activate/step2:
 *   post:
 *     summary: Step 2 - Upload Portfolio (Files/Links)
 *     tags: [Creator Portal]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               links:
 *                 type: array
 *                 items:
 *                   type: string
 *               portfolio:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portfolio updated
 */
router.post(
    "/activate/step2",
    upload.fields([{ name: "portfolio", maxCount: 5 }]),
    uploadPortfolio
);

/**
 * @swagger
 * /creators/activate/step3:
 *   post:
 *     summary: Step 3 - Submit Equipment List
 *     tags: [Creator Portal]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               equipment:
 *                 type: array
 *                 items:
 *                   type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Equipment list updated
 */
router.post("/activate/step3", updateEquipment);

/**
 * @swagger
 * /creators/profile:
 *   patch:
 *     summary: Update complete creator profile
 *     tags: [Creator Portal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *               bio:
 *                 type: string
 *               creatorType:
 *                 type: string
 *               baseCity:
 *                 type: string
 *               country:
 *                 type: string
 *               pricing:
 *                 type: object
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch("/profile", updateProfile);

export default router;
