import { Request, Response } from "express";
import { SharePointAuthService } from "../services/sharepointAuth.service";
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
}

/**
 * SharePoint Controller
 * Handles HTTP requests for SharePoint authentication and document management
 */
export class SharePointController {
    private authService = new SharePointAuthService();

    /**
     * Get SharePoint OAuth authorization URL
     * GET /api/v1/sharepoint/auth
     */
    async getAuthUrl(req: ExtendedRequest, res: Response) {
        try {
            // Get userId from either authenticated user or query parameter
            let userId = req.user?.userId;

            if (!userId && req.query.userId) {
                userId = req.query.userId as string;
                console.log(`Using userId from query parameter: ${userId}`);
            }

            console.log('Generating SharePoint auth URL for userId:', userId || 'none');
            const authUrl = await this.authService.getAuthorizationUrl(userId);

            return res.status(200).json(buildResponse(
                { authUrl },
                `SharePoint auth URL generated successfully ${userId ? 'for user ' + userId : ''}`
            ));
        } catch (error) {
            console.error('Error generating SharePoint auth URL:', error);
            return res.status(500).json(buildResponse(
                "",
                "Failed to generate auth URL",
                error
            ));
        }
    }

    /**
     * Handle SharePoint OAuth callback
     * GET /api/v1/sharepoint/auth/callback
     */
    async handleCallback(req: ExtendedRequest, res: Response) {
        try {
            const { code, state } = req.query;

            console.log('SharePoint callback received:', {
                hasCode: !!code,
                hasState: !!state
            });

            if (!code || typeof code !== 'string') {
                console.error('Missing or invalid authorization code');
                return res.status(400).json(buildResponse(
                    "",
                    "Invalid authorization code"
                ));
            }

            // Try to get userId from state parameter or authenticated user
            let userId = req.user?.userId;
            if (!userId && state && typeof state === 'string') {
                userId = state;
                console.log('Using state as userId:', userId);
            }

            if (!userId) {
                console.warn('No userId available - tokens will not be saved to a user');
            }

            // Exchange code for tokens
            const tokens = await this.authService.exchangeCodeForTokens(code, userId);

            console.log('✓ SharePoint authentication successful');

            // If frontend URL is configured, redirect there
            if (process.env.FRONTEND_URL) {
                const redirectUrl = `${process.env.FRONTEND_URL}/auth-success?provider=sharepoint${userId ? `&userId=${userId}` : ''}`;
                console.log('Redirecting to:', redirectUrl);
                return res.redirect(redirectUrl);
            }

            // Otherwise return JSON response
            return res.status(200).json(buildResponse(
                {
                    message: 'Authentication successful',
                    userId: userId || 'none',
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken
                },
                "SharePoint authentication successful"
            ));
        } catch (error) {
            console.error('Error handling SharePoint callback:', error);

            // If frontend URL is configured, redirect with error
            if (process.env.FRONTEND_URL) {
                return res.redirect(
                    `${process.env.FRONTEND_URL}/auth-error?provider=sharepoint&error=${encodeURIComponent(error.message)}`
                );
            }

            return res.status(500).json(buildResponse(
                "",
                "Failed to handle SharePoint callback",
                error
            ));
        }
    }

    /**
     * Check if user is connected to SharePoint
     * GET /api/v1/sharepoint/connection
     */
    async checkConnection(req: ExtendedRequest, res: Response) {
        try {
            // Get userId from either authenticated user or query parameter
            let userId = req.user?.userId;

            if (!userId && req.query.userId) {
                userId = req.query.userId as string;
                console.log(`Using userId from query parameter: ${userId}`);
            }

            if (!userId) {
                console.log('ERROR: No userId provided');
                return res.status(401).json(buildResponse(
                    "",
                    "Unauthorized - No user ID provided"
                ));
            }

            console.log(`Checking SharePoint connection for user: ${userId}`);
            const isConnected = await this.authService.isUserConnected(userId);

            return res.status(200).json(buildResponse(
                { connected: isConnected },
                isConnected
                    ? "User is connected to SharePoint"
                    : "User is not connected to SharePoint"
            ));
        } catch (error) {
            console.error('Error checking SharePoint connection:', error);
            return res.status(500).json(buildResponse(
                "",
                "Failed to check SharePoint connection",
                error
            ));
        }
    }

    /**
     * Get SharePoint connection status with detailed info
     * GET /api/v1/sharepoint/status
     */
    async getConnectionStatus(req: ExtendedRequest, res: Response) {
        try {
            let userId = req.user?.userId;

            if (!userId && req.query.userId) {
                userId = req.query.userId as string;
            }

            if (!userId) {
                return res.status(401).json(buildResponse(
                    "",
                    "Unauthorized - No user ID provided"
                ));
            }

            const tokens = await this.authService.getUserTokens(userId);

            if (!tokens) {
                return res.status(200).json(buildResponse(
                    {
                        userId,
                        connected: false,
                        hasTokens: false
                    },
                    "User not connected to SharePoint"
                ));
            }

            const now = Date.now();
            const isExpired = now >= tokens.expiryDate;

            return res.status(200).json(buildResponse(
                {
                    userId,
                    connected: true,
                    hasTokens: true,
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken,
                    tokenExpiry: new Date(tokens.expiryDate).toISOString(),
                    isExpired,
                    willRefresh: isExpired && !!tokens.refreshToken
                },
                "SharePoint connection status retrieved"
            ));
        } catch (error) {
            console.error('Error getting SharePoint status:', error);
            return res.status(500).json(buildResponse(
                "",
                "Failed to get connection status",
                error
            ));
        }
    }

    /**
     * Disconnect SharePoint (remove tokens)
     * DELETE /api/v1/sharepoint/connection
     */
    async disconnect(req: ExtendedRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json(buildResponse(
                    "",
                    "Unauthorized - No user ID provided"
                ));
            }

            await this.authService.revokeConnection(userId);

            return res.status(200).json(buildResponse(
                { userId },
                "SharePoint connection removed successfully"
            ));
        } catch (error) {
            console.error('Error disconnecting SharePoint:', error);
            return res.status(500).json(buildResponse(
                "",
                "Failed to disconnect SharePoint",
                error
            ));
        }
    }

    /**
     * Upload document to SharePoint
     * POST /api/v1/sharepoint/upload/:contactId
     */
    async uploadDocument(req: ExtendedRequest, res: Response) {
        try {
            const { contactId } = req.params;
            const userId = req.user?.userId;
            const file = req.file;
            const { description, documentType, customDocumentType, startTime, endTime } = req.body;

            if (!userId) {
                return res.status(401).json(buildResponse("", "Unauthorized"));
            }

            if (!file) {
                return res.status(400).json(buildResponse("", "No file uploaded"));
            }

            // Initialize service here to avoid circular dependency issues during instantiation if any
            const sharePointService = new SharePointService();

            const document = await sharePointService.uploadFile(
                userId,
                contactId,
                file,
                {
                    description,
                    documentType,
                    customDocumentType,
                    startTime: startTime ? new Date(startTime) : undefined,
                    endTime: endTime ? new Date(endTime) : undefined
                }
            );

            return res.status(201).json(buildResponse(document, "Document uploaded successfully"));
        } catch (error) {
            console.error('Error uploading document:', error);
            return res.status(500).json(buildResponse("", error.message || "Failed to upload document", error));
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

            const sharePointService = new SharePointService();
            const result = await sharePointService.getContactDocuments(contactId, page, limit, search);

            return res.status(200).json(buildResponse(result, "Documents retrieved successfully"));
        } catch (error) {
            console.error('Error fetching contact documents:', error);
            return res.status(500).json(buildResponse("", "Failed to fetch documents", error));
        }
    }

    /**
     * Get logged-in user's documents
     * GET /api/v1/sharepoint/user
     */
    async getUserDocuments(req: ExtendedRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json(buildResponse("", "Unauthorized"));
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;

            const sharePointService = new SharePointService();
            const result = await sharePointService.getUserDocuments(userId, page, limit, search);

            return res.status(200).json(buildResponse(result, "User documents retrieved successfully"));
        } catch (error) {
            console.error('Error fetching user documents:', error);
            return res.status(500).json(buildResponse("", "Failed to fetch user documents", error));
        }
    }

    /**
     * Get ALL documents (Admin only)
     * GET /api/v1/sharepoint/admin
     */
    async getAdminDocuments(req: ExtendedRequest, res: Response) {
        try {
            // TODO: Add admin role check here if needed, or rely on route middleware
            // const isAdmin = req.user?.roles?.includes('ADMIN'); 

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const organizationId = req.query.organizationId as string;

            const sharePointService = new SharePointService();
            const result = await sharePointService.getAllDocuments(page, limit, search, organizationId);

            return res.status(200).json(buildResponse(result, "All documents retrieved successfully"));
        } catch (error) {
            console.error('Error fetching admin documents:', error);
            return res.status(500).json(buildResponse("", "Failed to fetch documents", error));
        }
    }

    /**
     * Delete document
     * DELETE /api/v1/sharepoint/:documentId
     */
    async deleteDocument(req: ExtendedRequest, res: Response) {
        try {
            const { documentId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json(buildResponse("", "Unauthorized"));
            }

            // Check if user is admin (mock check, replace with actual role check)
            // const isAdmin = req.user?.roles?.some(r => r.name === 'ADMIN');
            const isAdmin = false; // Default to false for safety, update with actual logic

            const sharePointService = new SharePointService();
            await sharePointService.deleteDocument(documentId, userId, isAdmin);

            return res.status(200).json(buildResponse(null, "Document deleted successfully"));
        } catch (error) {
            console.error('Error deleting document:', error);
            return res.status(500).json(buildResponse("", error.message || "Failed to delete document", error));
        }
    }

    /**
     * Get document details / download link
     * GET /api/v1/sharepoint/:documentId
     */
    async getDocument(req: ExtendedRequest, res: Response) {
        try {
            const { documentId } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json(buildResponse("", "Unauthorized"));
            }

            const sharePointService = new SharePointService();
            const document = await sharePointService.getDocument(documentId, userId);

            return res.status(200).json(buildResponse(document, "Document retrieved successfully"));
        } catch (error) {
            console.error('Error fetching document:', error);
            return res.status(500).json(buildResponse("", "Failed to fetch document", error));
        }
    }
}
