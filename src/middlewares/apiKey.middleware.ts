import { Response, NextFunction } from "express";
import { CustomRequest } from "../interfaces/types";
import ApiKeyService from "../services/apiKey.service";

const apiKeyService = new ApiKeyService();

/**
 * Middleware to authenticate requests using API keys
 * Use this for automation tools like n8n, Zapier, etc.
 */
export const apiKeyAuth = async (
    request: CustomRequest,
    response: Response,
    next: NextFunction
) => {
    try {
        // Check for API key in header
        const apiKeyHeader =
            request.headers["x-api-key"] || request.headers["authorization"];

        if (!apiKeyHeader) {
            return response.status(401).json({
                success: false,
                message: "API key is required. Provide it in 'x-api-key' header.",
            });
        }

        // Extract the key (handle both "Bearer token" and direct key formats)
        let apiKey: string;
        if (typeof apiKeyHeader === "string") {
            apiKey = apiKeyHeader.startsWith("Bearer ")
                ? apiKeyHeader.substring(7)
                : apiKeyHeader;
        } else {
            apiKey = apiKeyHeader[0];
        }

        // Verify the API key
        const validApiKey = await apiKeyService.verifyApiKey(apiKey);

        if (!validApiKey) {
            return response.status(401).json({
                success: false,
                message: "Invalid or expired API key",
            });
        }

        // Attach API key info to request for use in controllers
        request.apiKey = {
            apiKeyId: validApiKey.apiKeyId,
            organisationId: validApiKey.organisationId,
            permissions: validApiKey.permissions || [],
            name: validApiKey.name,
        };

        // Also set organization ID for compatibility with existing code
        // Also set organization ID for compatibility with existing code
        if (validApiKey.owner) {
            // Impersonate the owner
            request.user = {
                userId: validApiKey.owner.userId,
                email: validApiKey.owner.email,
                emailVerified: validApiKey.owner.emailVerified,
                role: validApiKey.owner.roles || [],
                organizationId: validApiKey.organisationId,
                auth_time: Math.floor(Date.now() / 1000),
            };
        } else {
            // Fallback for keys without owners
            request.user = {
                userId: "api-key-user", // Placeholder for API key requests
                email: "api@automation.system",
                emailVerified: true,
                role: [],
                organizationId: validApiKey.organisationId,
                auth_time: Math.floor(Date.now() / 1000),
            };
        }

        next();
    } catch (error) {
        console.error("API Key authentication error:", error);
        return response.status(500).json({
            success: false,
            message: "Internal server error during authentication",
        });
    }
};

/**
 * Middleware to check if API key has specific permission
 */
export const requirePermission = (permission: string) => {
    return (request: CustomRequest, response: Response, next: NextFunction) => {
        if (!request.apiKey) {
            return response.status(403).json({
                success: false,
                message: "API key authentication required",
            });
        }

        const hasPermission = request.apiKey.permissions.includes(permission);

        if (!hasPermission) {
            return response.status(403).json({
                success: false,
                message: `Permission denied. Required permission: ${permission}`,
            });
        }

        next();
    };
};
