import { AppDataSource } from "../data-source";
import { ApiKey } from "../entity/ApiKey";
import { Organisation } from "../entity/Organisation";
import { User } from "../entity/User";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { ResourceNotFoundError } from "../common/errors";

class ApiKeyService {
    private apiKeyRepository = AppDataSource.getRepository(ApiKey);
    private organisationRepository = AppDataSource.getRepository(Organisation);

    /**
     * Generate a secure API key
     */
    private generateApiKey(): string {
        // Generate a random 32-byte key and encode as base64
        const key = crypto.randomBytes(32).toString("base64url");
        return `cxo_${key}`; // Prefix for easy identification
    }

    /**
     * Hash an API key for secure storage
     */
    private hashApiKey(apiKey: string): string {
        return crypto.createHash("sha256").update(apiKey).digest("hex");
    }

    /**
     * Create a new API key
     */
    async createApiKey(data: {
        name: string;
        description?: string;
        organisationId: string;
        createdBy: string;
        ownerId?: string; // Optional: Assign to specific user
        permissions?: string[];
        expiresAt?: Date;
    }): Promise<{ apiKey: ApiKey; plainTextKey: string }> {
        // Verify organisation exists
        const organisation = await this.organisationRepository.findOne({
            where: { organisationId: data.organisationId },
        });

        if (!organisation) {
            throw new ResourceNotFoundError("Organisation not found");
        }

        // Generate the API key
        const plainTextKey = this.generateApiKey();
        const hashedKey = this.hashApiKey(plainTextKey);

        // Create the API key entity
        const apiKey = new ApiKey({
            apiKeyId: uuidv4(),
            apiKey: hashedKey,
            name: data.name,
            description: data.description || "",
            organisationId: data.organisationId,
            organisation: organisation,
            createdBy: data.createdBy,
            ownerId: data.ownerId || data.createdBy, // Default to creator if not specified
            permissions: data.permissions || ["leads:create", "leads:read"],
            isActive: true,
            expiresAt: data.expiresAt || undefined, // undefined = never expires
        });

        await this.apiKeyRepository.save(apiKey);

        // Return both the entity and the plain text key (only shown once!)
        return {
            apiKey,
            plainTextKey, // IMPORTANT: This is the only time the plain text key is available
        };
    }

    /**
     * Verify an API key and return the associated organisation
     */
    async verifyApiKey(plainTextKey: string): Promise<ApiKey | null> {
        const hashedKey = this.hashApiKey(plainTextKey);

        const apiKey = await this.apiKeyRepository.findOne({
            where: { apiKey: hashedKey, isActive: true },
            relations: ["organisation", "owner"],
        });

        if (!apiKey) {
            return null;
        }

        // Check if expired
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return null;
        }

        // Update last used timestamp
        apiKey.lastUsedAt = new Date();
        await this.apiKeyRepository.save(apiKey);

        return apiKey;
    }

    /**
     * List all API keys for an organisation
     */
    async listApiKeys(organisationId: string): Promise<ApiKey[]> {
        return await this.apiKeyRepository.find({
            where: { organisationId },
            relations: ["owner"],
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Update an API key
     */
    async updateApiKey(
        apiKeyId: string,
        organisationId: string,
        data: {
            name?: string;
            description?: string;
            ownerId?: string;
            permissions?: string[];
            isActive?: boolean;
        }
    ): Promise<ApiKey> {
        const apiKey = await this.apiKeyRepository.findOne({
            where: { apiKeyId, organisationId },
        });

        if (!apiKey) {
            throw new ResourceNotFoundError("API key not found");
        }

        if (data.name) apiKey.name = data.name;
        if (data.description !== undefined) apiKey.description = data.description;
        if (data.ownerId) {
            // Validate user exists in the same organisation
            const user = await AppDataSource.getRepository(User).findOne({
                where: { userId: data.ownerId, organisation: { organisationId } } as any,
            });
            if (!user) {
                throw new ResourceNotFoundError("User not found or not in this organization");
            }
            apiKey.ownerId = data.ownerId;
        }
        if (data.permissions) apiKey.permissions = data.permissions;
        if (data.isActive !== undefined) apiKey.isActive = data.isActive;

        return await this.apiKeyRepository.save(apiKey);
    }

    /**
     * Revoke (deactivate) an API key
     */
    async revokeApiKey(apiKeyId: string, organisationId: string): Promise<void> {
        const apiKey = await this.apiKeyRepository.findOne({
            where: { apiKeyId, organisationId },
        });

        if (!apiKey) {
            throw new ResourceNotFoundError("API key not found");
        }

        apiKey.isActive = false;
        await this.apiKeyRepository.save(apiKey);
    }

    /**
     * Delete an API key permanently
     */
    async deleteApiKey(apiKeyId: string, organisationId: string): Promise<void> {
        const result = await this.apiKeyRepository.delete({
            apiKeyId,
            organisationId,
        });

        if (result.affected === 0) {
            throw new ResourceNotFoundError("API key not found");
        }
    }
}

export default ApiKeyService;
