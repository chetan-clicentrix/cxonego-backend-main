import { Router } from "express";
import LeadController from "../controllers/lead.controller";
import { apiKeyAuth } from "../middlewares/apiKey.middleware";

const router = Router();
const leadController = new LeadController();

/**
 * @swagger
 * /api/lead:
 *   post:
 *     summary: Create a new lead using API key authentication (for n8n, Zapier, etc.)
 *     tags: [API - Automation]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               source:
 *                 type: string
 *                 example: "WhatsApp"
 *               status:
 *                 type: string
 *                 example: "New"
 *               description:
 *                 type: string
 *                 example: "Lead captured from WhatsApp automation"
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       401:
 *         description: Invalid or missing API key
 *       403:
 *         description: Permission denied
 */
router.post("/", apiKeyAuth, leadController.createLead.bind(leadController));

export default router;
