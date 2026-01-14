import { Router } from "express";
import { SharePointController } from "../controllers/sharepoint.controller";
import * as multer from "multer";

const router = Router();
const sharepointController = new SharePointController();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * SharePoint Document Management Routes
 * Uses Service Principal authentication - no user OAuth required
 */

/**
 * @swagger
 * /sharepoint/upload/{opportunityId}:
 *   post:
 *     summary: Upload a document to SharePoint
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: opportunityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the opportunity to associate the document with
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *               documentType:
 *                 type: string
 *                 enum: [NDA, MSA, SOW, SLA, AMC, MOU, OTHER]
 *               customDocumentType:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
    "/upload/:opportunityId",
    upload.single("file"),
    sharepointController.uploadDocument.bind(sharepointController)
);

/**
 * @swagger
 * /sharepoint/opportunity/{opportunityId}:
 *   get:
 *     summary: Get documents for a specific opportunity
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: opportunityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of documents
 *       401:
 *         description: Unauthorized
 */
router.get("/opportunity/:opportunityId", sharepointController.getOpportunityDocuments.bind(sharepointController));

/**
 * @swagger
 * /sharepoint/user:
 *   get:
 *     summary: Get documents uploaded by the current user
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user documents
 *       401:
 *         description: Unauthorized
 */
router.get("/user", sharepointController.getUserDocuments.bind(sharepointController));

/**
 * @swagger
 * /sharepoint/admin:
 *   get:
 *     summary: Get ALL documents (Admin only)
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all documents
 *       401:
 *         description: Unauthorized
 */
router.get("/admin", sharepointController.getAdminDocuments.bind(sharepointController));

/**
 * @swagger
 * /sharepoint/{documentId}:
 *   get:
 *     summary: Get document details / download link
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document details
 *       404:
 *         description: Document not found
 */
router.get("/:documentId", sharepointController.getDocument.bind(sharepointController));

/**
 * @swagger
 * /sharepoint/{documentId}:
 *   delete:
 *     summary: Delete a document
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:documentId", sharepointController.deleteDocument.bind(sharepointController));

export default router;
