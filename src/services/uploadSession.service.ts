import { AppDataSource } from "../data-source";
import { UploadSession, UploadSessionStatus } from "../entity/UploadSession";
import { Oppurtunity } from "../entity/Oppurtunity";
import { userInfo } from "../interfaces/types";
import { EntityManager } from "typeorm";
import { ResourceNotFoundError, ValidationFailedError } from "../common/errors";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { DocumentRequirement } from "../entity/DocumentRequirement";
import { DocumentUpload, UploadStatus } from "../entity/DocumentUpload";

class UploadSessionService {
    /**
     * Generate secure session token
     */
    private generateSessionToken(): string {
        return crypto.randomBytes(32).toString("base64url");
    }

    /**
     * Create upload session for an opportunity
     */
    async createSession(
        opportunityId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ): Promise<UploadSession> {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const opportunityRepo = transactionEntityManager.getRepository(Oppurtunity);
        const sessionRepo = transactionEntityManager.getRepository(UploadSession);

        // Verify opportunity exists
        const opportunity = await opportunityRepo.findOne({
            where: {
                opportunityId,
                organization: { organisationId: user.organizationId },
            },
        });

        if (!opportunity) {
            throw new ResourceNotFoundError("Opportunity not found");
        }

        // ── Proposal group guard ─────────────────────────────────────────
        // When an opportunity is part of a multi-bank group, only the primary
        // proposal can generate a customer upload link.
        if (opportunity.proposalGroupId && !opportunity.isPrimary) {
            throw new ValidationFailedError(
                "Generate Link is only available on the primary proposal of a group. Please use the primary bank's proposal."
            );
        }
        // ────────────────────────────────────────────────────────────────

        // Check if active session already exists
        const existingSession = await sessionRepo.findOne({
            where: {
                opportunityId,
                status: UploadSessionStatus.ACTIVE,
            },
        });

        if (existingSession && existingSession.expiresAt > new Date()) {
            return existingSession;
        }

        // Create new session
        const expiryHours = parseInt(process.env.UPLOAD_SESSION_EXPIRY_HOURS || "72");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiryHours);

        const session = new UploadSession({
            uploadSessionId: uuidv4(),
            sessionToken: this.generateSessionToken(),
            opportunityId,
            opportunity,
            status: UploadSessionStatus.ACTIVE,
            expiresAt,
            organization: { organisationId: user.organizationId } as any,
            modifiedBy: user.userId,
        } as UploadSession);

        const savedSession = await sessionRepo.save(session);
        return savedSession;
    }

    /**
     * Validate session token and return session
     */
    async validateSession(sessionToken: string): Promise<UploadSession> {
        const sessionRepo = AppDataSource.getRepository(UploadSession);

        const session = await sessionRepo.findOne({
            where: { sessionToken },
        });

        if (!session) {
            throw new ResourceNotFoundError("Upload session not found");
        }

        // Check if expired
        if (session.expiresAt < new Date()) {
            session.status = UploadSessionStatus.EXPIRED;
            await sessionRepo.save(session);
            throw new ValidationFailedError("Upload session has expired");
        }

        // Check if already completed
        if (session.status === UploadSessionStatus.COMPLETED) {
            throw new ValidationFailedError("Upload session is already completed");
        }

        return session;
    }

    /**
     * Get session by ID
     */
    async getSession(uploadSessionId: string, userInfo: userInfo): Promise<UploadSession> {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const sessionRepo = AppDataSource.getRepository(UploadSession);
        const session = await sessionRepo.findOne({
            where: {
                uploadSessionId,
                organization: { organisationId: userInfo.organizationId },
            },
        });

        if (!session) {
            throw new ResourceNotFoundError("Upload session not found");
        }

        return session;
    }

    /**
     * Mark session as completed
     */
    async completeSession(
        uploadSessionId: string,
        transactionEntityManager: EntityManager
    ): Promise<void> {
        const sessionRepo = transactionEntityManager.getRepository(UploadSession);

        await sessionRepo.update(
            { uploadSessionId },
            { status: UploadSessionStatus.COMPLETED }
        );
    }

    /**
     * Get all sessions for an opportunity
     */
    async getSessionsByOpportunity(
        opportunityId: string,
        userInfo: userInfo
    ): Promise<UploadSession[]> {
        if (!userInfo.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const sessionRepo = AppDataSource.getRepository(UploadSession);
        const sessions = await sessionRepo.find({
            where: {
                opportunityId,
                organization: { organisationId: userInfo.organizationId },
            },
            order: {
                createdAt: "DESC",
            },
        });

        return sessions;
    }

    /**
     * Track IP and User Agent for session
     */
    async trackSessionMetadata(
        sessionToken: string,
        ipAddress: string,
        userAgent: string
    ): Promise<void> {
        const sessionRepo = AppDataSource.getRepository(UploadSession);

        await sessionRepo.update(
            { sessionToken },
            { ipAddress, userAgent }
        );
    }

    /**
     * Delete upload session (Admin)
     */
    async deleteSession(
        uploadSessionId: string,
        user: userInfo,
        transactionEntityManager: EntityManager
    ): Promise<void> {
        if (!user.organizationId) {
            throw new ValidationFailedError("Organization ID is required");
        }

        const sessionRepo = transactionEntityManager.getRepository(UploadSession);

        // Verify session exists and belongs to user's organization
        const session = await sessionRepo.findOne({
            where: {
                uploadSessionId,
                organization: { organisationId: user.organizationId },
            },
        });

        if (!session) {
            throw new ResourceNotFoundError("Upload session not found");
        }

        // Delete session (cascade will handle related records)
        await sessionRepo.remove(session);
    }

    /**
     * Check if all required documents are uploaded and complete session
     */
    async checkAutoCompletion(
        uploadSessionId: string,
        opportunityId: string,
        organizationId: string
    ): Promise<boolean> {
        const requirementRepo = AppDataSource.getRepository(DocumentRequirement);
        const uploadRepo = AppDataSource.getRepository(DocumentUpload);

        // Get all mandatory requirements
        const requirements = await requirementRepo.find({
            where: {
                opportunityId,
                opportunity: {
                    organization: { organisationId: organizationId },
                },
                isRequired: true
            }
        });

        if (requirements.length === 0) {
            return false;
        }

        // Get all valid uploads (uploaded or processing or completed)
        const uploads = await uploadRepo.find({
            where: {
                uploadSessionId
            }
        });

        const validUploads = uploads.filter(u =>
            u.uploadStatus === UploadStatus.PROCESSING ||
            u.uploadStatus === UploadStatus.COMPLETED
        );

        const uploadedRequirementIds = validUploads.map(u => u.requirementId);

        // Check if every mandatory requirement has an upload
        const allUploaded = requirements.every(req =>
            uploadedRequirementIds.includes(req.requirementId)
        );

        if (allUploaded) {
            await this.completeSession(uploadSessionId, AppDataSource.manager);
            return true;
        }

        return false;
    }
}

export default UploadSessionService;

