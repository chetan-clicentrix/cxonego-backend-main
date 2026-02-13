import { Response } from "express";
import { AuthenticatedRequest } from "../interfaces/types";
import ApiKeyService from "../services/apiKey.service";
import { decrypt } from "../common/utils";

const apiKeyService = new ApiKeyService();

class ApiKeyController {
    /**
     * Create a new API key
     * POST /api/v1/api-keys
     */
    async createApiKey(request: AuthenticatedRequest, response: Response) {
        try {
            const { name, description, ownerId, permissions, expiresAt } = request.body;
            const organisationId = request.user?.organizationId;
            const createdBy = request.user?.userId;

            if (!organisationId || !createdBy) {
                return response.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            if (!name) {
                return response.status(400).json({
                    success: false,
                    message: "API key name is required",
                });
            }

            const result = await apiKeyService.createApiKey({
                name,
                description,
                organisationId,
                createdBy,
                ownerId,
                permissions: permissions || ["leads:create", "leads:read"],
                expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            });

            return response.status(201).json({
                success: true,
                message: "API key created successfully",
                data: {
                    apiKeyId: result.apiKey.apiKeyId,
                    name: result.apiKey.name,
                    description: result.apiKey.description,
                    ownerId: result.apiKey.ownerId,
                    apiKey: result.plainTextKey, // ⚠️ IMPORTANT: Save this! It won't be shown again
                    permissions: result.apiKey.permissions,
                    expiresAt: result.apiKey.expiresAt,
                    createdAt: result.apiKey.createdAt,
                },
                warning:
                    "⚠️ Save this API key securely! It will not be displayed again.",
            });
        } catch (error: any) {
            console.error("Error creating API key:", error);
            return response.status(500).json({
                success: false,
                message: error.message || "Failed to create API key",
            });
        }
    }

    /**
     * List all API keys for the organization
     * GET /api/v1/api-keys
     */
    async listApiKeys(request: AuthenticatedRequest, response: Response) {
        try {
            const organisationId = request.user?.organizationId;

            if (!organisationId) {
                return response.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            const apiKeys = await apiKeyService.listApiKeys(organisationId);

            // Don't return the actual API key, just metadata
            const sanitizedKeys = apiKeys.map((key) => ({
                apiKeyId: key.apiKeyId,
                name: key.name,
                description: key.description,
                isActive: key.isActive,
                ownerId: key.ownerId,
                owner: key.owner ? {
                    userId: key.owner.userId,
                    firstName: decrypt(key.owner.firstName),
                    lastName: decrypt(key.owner.lastName),
                    email: decrypt(key.owner.email)
                } : null,
                permissions: key.permissions,
                lastUsedAt: key.lastUsedAt,
                expiresAt: key.expiresAt,
                createdAt: key.createdAt,
                createdBy: key.createdBy,
            }));

            return response.status(200).json({
                success: true,
                data: sanitizedKeys,
            });
        } catch (error: any) {
            console.error("Error listing API keys:", error);
            return response.status(500).json({
                success: false,
                message: error.message || "Failed to list API keys",
            });
        }
    }

    /**
     * Update an API key
     * PATCH /api/v1/api-keys/:apiKeyId
     */
    async updateApiKey(request: AuthenticatedRequest, response: Response) {
        try {
            const { apiKeyId } = request.params;
            const organisationId = request.user?.organizationId;
            const { name, description, ownerId, permissions, isActive } = request.body;

            if (!organisationId) {
                return response.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            const updatedKey = await apiKeyService.updateApiKey(
                apiKeyId,
                organisationId,
                { name, description, ownerId, permissions, isActive }
            );

            return response.status(200).json({
                success: true,
                message: "API key updated successfully",
                data: {
                    apiKeyId: updatedKey.apiKeyId,
                    name: updatedKey.name,
                    description: updatedKey.description,
                    ownerId: updatedKey.ownerId,
                    isActive: updatedKey.isActive,
                    permissions: updatedKey.permissions,
                    updatedAt: updatedKey.updatedAt
                }
            });
        } catch (error: any) {
            console.error("Error updating API key:", error);
            return response.status(404).json({
                success: false,
                message: error.message || "Failed to update API key",
            });
        }
    }

    /**
     * Revoke (deactivate) an API key
     * DELETE /api/v1/api-keys/:apiKeyId/revoke
     */
    async revokeApiKey(request: AuthenticatedRequest, response: Response) {
        try {
            const { apiKeyId } = request.params;
            const organisationId = request.user?.organizationId;

            if (!organisationId) {
                return response.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            await apiKeyService.revokeApiKey(apiKeyId, organisationId);

            return response.status(200).json({
                success: true,
                message: "API key revoked successfully",
            });
        } catch (error: any) {
            console.error("Error revoking API key:", error);
            return response.status(404).json({
                success: false,
                message: error.message || "Failed to revoke API key",
            });
        }
    }

    /**
     * Delete an API key permanently
     * DELETE /api/v1/api-keys/:apiKeyId
     */
    async deleteApiKey(request: AuthenticatedRequest, response: Response) {
        try {
            const { apiKeyId } = request.params;
            const organisationId = request.user?.organizationId;

            if (!organisationId) {
                return response.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            await apiKeyService.deleteApiKey(apiKeyId, organisationId);

            return response.status(200).json({
                success: true,
                message: "API key deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting API key:", error);
            return response.status(404).json({
                success: false,
                message: error.message || "Failed to delete API key",
            });
        }
    }
}

export default ApiKeyController;
