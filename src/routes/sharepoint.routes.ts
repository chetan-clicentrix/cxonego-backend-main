import { Router } from "express";
import { SharePointController } from "../controllers/sharepoint.controller";
import * as multer from "multer";

const router = Router();
const sharepointController = new SharePointController();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/v1/sharepoint/auth:
 *   get:
 *     tags:
 *       - SharePoint
 *     summary: Get SharePoint OAuth authorization URL
 *     description: Returns a URL to redirect user for SharePoint authentication
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional user ID to maintain through OAuth flow
 *     responses:
 *       200:
 *         description: Auth URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     authUrl:
 *                       type: string
 *                       description: URL to redirect user to for authentication
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to generate auth URL
 */
router.get("/auth", sharepointController.getAuthUrl.bind(sharepointController));

/**
 * @swagger
 * /api/v1/sharepoint/auth/callback:
 *   get:
 *     tags:
 *       - SharePoint
 *     summary: Handle SharePoint OAuth callback
 *     description: Process the callback from Microsoft after user authentication
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Authorization code from Microsoft
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: false
 *         description: State parameter (typically userId)
 *     responses:
 *       200:
 *         description: Authentication successful
 *       302:
 *         description: Redirect to frontend (if configured)
 *       400:
 *         description: Invalid code
 *       500:
 *         description: Failed to authenticate
 */
router.get("/auth/callback", sharepointController.handleCallback.bind(sharepointController));

/**
 * @swagger
 * /api/v1/sharepoint/connection:
 *   get:
 *     tags:
 *       - SharePoint
 *     summary: Check SharePoint connection status
 *     description: Checks if the user is connected to SharePoint
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: User ID to check (required if not authenticated)
 *     responses:
 *       200:
 *         description: Connection status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                       description: Whether user is connected to SharePoint
 *                 message:
 *                   type: string
 *       401:
 *         description: No user ID provided
 *       500:
 *         description: Failed to check connection
 */
router.get("/connection", sharepointController.checkConnection.bind(sharepointController));

/**
 * @swagger
 * /api/v1/sharepoint/status:
 *   get:
 *     tags:
 *       - SharePoint
 *     summary: Get detailed SharePoint connection status
 *     description: Returns detailed information about user's SharePoint connection including token status
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: User ID to check
 *     responses:
 *       200:
 *         description: Detailed status retrieved
 *       401:
 *         description: No user ID provided
 *       500:
 *         description: Failed to get status
 */
router.get("/status", sharepointController.getConnectionStatus.bind(sharepointController));

/**
 * @swagger
 * /api/v1/sharepoint/connection:
 *   delete:
 *     tags:
 *       - SharePoint
 *     summary: Disconnect SharePoint
 *     description: Remove SharePoint connection and tokens for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection removed successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to disconnect
 */
router.delete("/connection", sharepointController.disconnect.bind(sharepointController));

/**
 * @swagger
 * /sharepoint/upload/{contactId}:
 *   post:
 *     summary: Upload a document to SharePoint
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the contact to associate the document with
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
    "/upload/:contactId",
    upload.single("file"),
    sharepointController.uploadDocument
);

/**
 * @swagger
 * /sharepoint/contact/{contactId}:
 *   get:
 *     summary: Get documents for a specific contact
 *     tags: [SharePoint]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contactId
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
router.get("/contact/:contactId", sharepointController.getContactDocuments);

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
router.get("/user", sharepointController.getUserDocuments);

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
router.get("/admin", sharepointController.getAdminDocuments);

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
router.get("/:documentId", sharepointController.getDocument);

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
router.delete("/:documentId", sharepointController.deleteDocument);

export default router;
