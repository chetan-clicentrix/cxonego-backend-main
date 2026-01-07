import { Request, Response } from "express";
import { SharePointService } from "../services/sharepoint.service";
import { buildResponse } from "../common/utils";

/**
 * Extended request interface with user context
 */
interface ExtendedRequest extends Request {
    user?: {
        userId: string;
        organizationId: string;
    };
    userId: string;
    organizationId: string;
}

/**
 * SharePoint Controller
 * Handles HTTP requests for SharePoint document management
 * Uses Service Principal authentication - no user OAuth required
 */
export class SharePointController {
    private sharepointService = new SharePointService();

    /**
     * Upload document to SharePoint
     * POST /api/v1/sharepoint/upload/:contactId
     */
    async uploadDocument(req: ExtendedRequest, res: Response) {
        try {
            const { contactId } = req.params;
            const userId = req.user?.userId || req.userId;
            const file = req.file;

            if (!file) {
                return res.status(400).json(buildResponse(null, "No file uploaded", false));
            }

            if (!userId) {
                return res.status(401).json(buildResponse(null, "User not authenticated", false));
            }

            const { description, documentType, customDocumentType, startTime, endTime } = req.body;

            const document = await this.sharepointService.uploadFile(
                userId,
                contactId,
                file,
                {
                    description,
                    documentType,
                    customDocumentType,
                    startTime: startTime ? new Date(startTime) : undefined,
                    endTime: endTime ? new Date(endTime) : undefined,
                }
            );

            return res.status(201).json(buildResponse(document, "Document uploaded successfully"));
        } catch (error) {
            console.error("Error uploading document:", error);
            return res.status(500).json(buildResponse(null, error.message || "Failed to upload document", false));
        }
    }

    /**
     * Get documents for a contact
     * GET /api/v1/sharepoint/contact/:contactId
     */
    async getContactDocuments(req: ExtendedRequest, res: Response) {
        try {
            const { contactId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const result = await this.sharepointService.getContactDocuments(contactId, page, limit, search);

            return res.status(200).json(buildResponse(result, "Documents retrieved successfully"));
        } catch (error) {
            console.error("Error getting contact documents:", error);
            return res.status(500).json(buildResponse(null, error.message || "Failed to get documents", false));
        }
    }

    /**
     * Get logged-in user's documents
     * GET /api/v1/sharepoint/user
     */
    async getUserDocuments(req: ExtendedRequest, res: Response) {
        try {
            const userId = req.user?.userId || req.userId;

            if (!userId) {
                return res.status(401).json(buildResponse(null, "User not authenticated", false));
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const result = await this.sharepointService.getUserDocuments(userId, page, limit, search);

            return res.status(200).json(buildResponse(result, "Documents retrieved successfully"));
        } catch (error) {
            console.error("Error getting user documents:", error);
            return res.status(500).json(buildResponse(null, error.message || "Failed to get documents", false));
        }
    }

    /**
     * Get ALL documents (Admin only)
     * GET /api/v1/sharepoint/admin
     */
    async getAdminDocuments(req: ExtendedRequest, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const organizationId = req.query.organizationId as string;

            const result = await this.sharepointService.getAllDocuments(page, limit, search, organizationId);

            return res.status(200).json(buildResponse(result, "Documents retrieved successfully"));
        } catch (error) {
            console.error("Error getting admin documents:", error);
            return res.status(500).json(buildResponse(null, error.message || "Failed to get documents", false));
        }
    }

    /**
     * Delete document
     * DELETE /api/v1/sharepoint/:documentId
     */
    async deleteDocument(req: ExtendedRequest, res: Response) {
        try {
            const { documentId } = req.params;
            const userId = req.user?.userId || req.userId;

            if (!userId) {
                return res.status(401).json(buildResponse(null, "User not authenticated", false));
            }

            // TODO: Check if user is admin
            const isAdmin = false; // Replace with actual admin check

            await this.sharepointService.deleteDocument(documentId, userId, isAdmin);

            return res.status(200).json(buildResponse(null, "Document deleted successfully"));
        } catch (error) {
            console.error("Error deleting document:", error);
            return res.status(500).json(buildResponse(null, error.message || "Failed to delete document", false));
        }
    }

    /**
     * Get document details / download link
     * GET /api/v1/sharepoint/:documentId
     */
    async getDocument(req: ExtendedRequest, res: Response) {
        try {
            const { documentId } = req.params;
            const userId = req.user?.userId || req.userId;

            if (!userId) {
                return res.status(401).json(buildResponse(null, "User not authenticated", false));
            }

            const document = await this.sharepointService.getDocument(documentId, userId);

            return res.status(200).json(buildResponse(document, "Document retrieved successfully"));
        } catch (error) {
            console.error("Error getting document:", error);
            return res.status(500).json(buildResponse(null, error.message || "Failed to get document", false));
        }
    }
}
