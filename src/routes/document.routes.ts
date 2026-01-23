import { Router } from "express";
import { DocumentController } from "../controllers/document.controller";
import * as multer from "multer";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

const router = Router();
const documentController = new DocumentController();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

/**
 * @swagger
 * /api/v1/document/auth/google:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get Google Drive authentication URL
 *     description: Returns a URL for Google Drive authentication
 *     responses:
 *       200:
 *         description: Authentication URL generated successfully
 *       500:
 *         description: Failed to generate auth URL
 */
router.get("/auth/google", documentController.getGoogleAuthUrl.bind(documentController));

/**
 * @swagger
 * /api/v1/document/auth/google/callback:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Handle Google Drive authentication callback
 *     description: Process the callback from Google Drive authentication
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Authorization code from Google
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Invalid code
 *       500:
 *         description: Failed to authenticate
 */
router.get("/auth/google/callback", documentController.handleGoogleCallback.bind(documentController));

/**
 * @swagger
 * /api/v1/document/google/connection:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Check Google Drive connection
 *     description: Checks if the user is connected to Google Drive
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to check connection for
 *     responses:
 *       200:
 *         description: Google Drive connection checked successfully
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
 *                       description: Whether the user is connected to Google Drive
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized - No user ID provided
 *       500:
 *         description: Failed to check Google Drive connection
 */
router.get("/google/connection", documentController.checkGoogleConnection.bind(documentController));

/**
 * @swagger
 * /api/v1/document/debug/connection:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Debug endpoint for Google Drive connection
 *     description: Provides detailed debug information about Google Drive connection
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to check connection for
 *     responses:
 *       200:
 *         description: Debug information returned successfully
 */
router.get("/debug/connection", async (req, res) => {
    try {
        const userId = req.query.userId as string;

        if (!userId) {
            return res.status(400).json({ error: "userId query parameter is required" });
        }

        // Try to find the user
        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { userId } });

        if (!user) {
            return res.status(404).json({ error: "User not found", userId });
        }

        // Return debug info
        return res.status(200).json({
            userId,
            hasGoogleTokens: !!user.googleTokens,
            googleTokens: user.googleTokens ? {
                hasRefreshToken: !!user.googleTokens.refreshToken,
                hasAccessToken: !!user.googleTokens.accessToken,
                tokenExpiry: user.googleTokens.expiryDate ? new Date(user.googleTokens.expiryDate).toISOString() : null
            } : null,
            message: "This is a debug endpoint to verify Google Drive connection setup"
        });
    } catch (error) {
        console.error("Error in debug endpoint:", error);
        return res.status(500).json({ error: "Internal server error", message: error.message });
    }
});

/**
 * @swagger
 * /api/v1/document/upload/{contactId}:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Upload a document for a contact
 *     description: Upload a file to Google Drive and associate with a contact
 *     parameters:
 *       - in: path
 *         name: contactId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the contact
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
 *                 description: File to upload
 *               description:
 *                 type: string
 *                 description: Description of the document
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to upload document
 */
router.post(
    "/upload/:contactId",
    upload.single('file') as any,
    documentController.uploadDocument.bind(documentController)
);

/**
 * @swagger
 * /api/v1/document/contact/{contactId}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get all documents for a contact
 *     description: Retrieves all documents associated with a contact. If user is admin, gets all documents. Otherwise, gets only documents uploaded by the user.
 *     parameters:
 *       - in: path
 *         name: contactId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the contact
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to get documents
 */
router.get(
    "/contact/:contactId",
    documentController.getDocumentsByContact.bind(documentController)
);

/**
 * @swagger
 * /api/v1/document/organization:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get all documents for the organization
 *     description: Retrieves all documents in the organization. Only accessible by organization admins.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization documents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to get organization documents
 */
router.get(
    "/organization",
    documentController.getAllOrganizationDocuments.bind(documentController)
);

/**
 * @swagger
 * /api/v1/document/user:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get all documents uploaded by the user
 *     description: Retrieves all documents uploaded by the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User documents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to get user documents
 */
router.get(
    "/user",
    documentController.getUserDocuments.bind(documentController)
);

/**
 * @swagger
 * /api/v1/document/{documentId}:
 *   delete:
 *     tags:
 *       - Documents
 *     summary: Delete a document
 *     description: Soft delete a document (mark as deleted). Organization admins can delete any document, while regular users can only delete documents they uploaded.
 *     parameters:
 *       - in: path
 *         name: documentId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the document to delete
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to delete document
 */
router.delete(
    "/:documentId",
    documentController.deleteDocument.bind(documentController)
);

/**
 * @swagger
 * /api/v1/document/auth/google/reconnect:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Force reconnection with Google Drive
 *     description: Creates a URL that forces the consent screen to appear to get a new refresh token
 *     responses:
 *       200:
 *         description: Reconnection URL generated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to generate reconnect URL
 */
router.get("/auth/google/reconnect", documentController.forceGoogleReconnect.bind(documentController));

/**
 * @swagger
 * /api/v1/document/auth/google/connection:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Alternative path for checking Google Drive connection
 *     description: Same as /google/connection endpoint, but with an alternative path
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user to check connection for
 *     responses:
 *       200:
 *         description: Google Drive connection checked successfully
 *       401:
 *         description: Unauthorized - No user ID provided
 *       500:
 *         description: Failed to check Google Drive connection
 */
router.get("/auth/google/connection", documentController.checkGoogleConnection.bind(documentController));

/**
 * Temporary debug helper for troubleshooting path issues
 */
router.get("*connection*", (req, res, next) => {
    console.log("DEBUG: Received request to a connection-related path");
    console.log(`Path: ${req.path}`);
    console.log(`Query: ${JSON.stringify(req.query)}`);
    console.log(`Method: ${req.method}`);

    // If this is a known path, let the actual handler deal with it
    if (
        req.path === '/google/connection' ||
        req.path === '/auth/google/connection' ||
        req.path === '/debug/connection'
    ) {
        return next();
    }

    // For any other path with "connection" in it, provide helpful info
    return res.status(200).json({
        message: "Connection check debug helper",
        receivedPath: req.path,
        recommendedPaths: [
            "/api/v1/document/google/connection",
            "/api/v1/document/auth/google/connection",
            "/api/v1/document/debug/connection"
        ],
        queryParams: req.query
    });
});

export default router; 