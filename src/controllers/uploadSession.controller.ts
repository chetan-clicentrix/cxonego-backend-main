import { Request, Response } from "express";
import UploadSessionService from "../services/uploadSession.service";
import DocumentRequirementService from "../services/documentRequirement.service";
import { AppDataSource } from "../data-source";
import { userInfo } from "../interfaces/types";
import { DocumentUpload } from "../entity/DocumentUpload";

const uploadSessionService = new UploadSessionService();
const documentRequirementService = new DocumentRequirementService();

/**
 * Create upload session for an opportunity (Admin)
 * POST /api/upload-session
 */
export const createUploadSession = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { opportunityId } = req.body;

        if (!opportunityId) {
            return res.status(400).json({
                success: false,
                error: "opportunityId is required",
            });
        }

        const session = await AppDataSource.transaction(async (manager) => {
            // Create session
            const newSession = await uploadSessionService.createSession(
                opportunityId,
                user,
                manager
            );

            // Auto-populate requirements from Bank config
            try {
                await documentRequirementService.createRequirementsFromBank(
                    opportunityId,
                    user,
                    manager
                );
            } catch (error: any) {
                console.warn("Could not auto-populate requirements from bank:", error.message);
                // Continue even if bank config not found - admin can add manually
            }

            return newSession;
        });

        // Generate public upload URL
        const publicUploadUrl = `${process.env.PUBLIC_UPLOAD_BASE_URL}/${session.sessionToken}`;

        res.json({
            success: true,
            data: {
                uploadSessionId: session.uploadSessionId,
                sessionToken: session.sessionToken,
                opportunityId: session.opportunityId,
                expiresAt: session.expiresAt,
                status: session.status,
                publicUploadUrl,
            },
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get upload session details (Admin)
 * GET /api/upload-session/:uploadSessionId
 */
export const getUploadSessionDetails = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { uploadSessionId } = req.params;

        const session = await uploadSessionService.getSession(uploadSessionId, user);

        res.json({
            success: true,
            data: session,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get all sessions for an opportunity (Admin)
 * GET /api/upload-session/opportunity/:opportunityId
 */
export const getOpportunitySessions = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { opportunityId } = req.params;

        const sessions = await uploadSessionService.getSessionsByOpportunity(
            opportunityId,
            user
        );

        res.json({
            success: true,
            data: sessions,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Create manual document requirement (Admin)
 * POST /api/upload-session/:uploadSessionId/requirement
 */
export const createRequirement = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { uploadSessionId } = req.params;
        const requirementData = req.body;

        // Get session to verify ownership
        const session = await uploadSessionService.getSession(uploadSessionId, user);

        const requirement = await AppDataSource.transaction(async (manager) => {
            return await documentRequirementService.createRequirement(
                {
                    ...requirementData,
                    opportunityId: session.opportunityId,
                },
                user,
                manager
            );
        });

        res.json({
            success: true,
            data: requirement,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get requirements for opportunity (Admin)
 * GET /api/upload-session/opportunity/:opportunityId/requirements
 */
export const getOpportunityRequirements = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { opportunityId } = req.params;

        const requirements = await documentRequirementService.getRequirementsByOpportunity(
            opportunityId,
            user
        );

        res.json({
            success: true,
            data: requirements,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Update requirement (Admin)
 * PUT /api/upload-session/requirement/:requirementId
 */
export const updateRequirement = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { requirementId } = req.params;
        const updateData = req.body;

        await AppDataSource.transaction(async (manager) => {
            await documentRequirementService.updateRequirement(
                requirementId,
                updateData,
                user,
                manager
            );
        });

        res.json({
            success: true,
            message: "Requirement updated successfully",
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Delete requirement (Admin)
 * DELETE /api/upload-session/requirement/:requirementId
 */
export const deleteRequirement = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { requirementId } = req.params;

        await AppDataSource.transaction(async (manager) => {
            await documentRequirementService.deleteRequirement(requirementId, user, manager);
        });

        res.json({
            success: true,
            message: "Requirement deleted successfully",
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get all uploaded documents for an opportunity (Admin)
 * GET /api/upload-session/opportunity/:opportunityId/uploads
 */
export const getOpportunityUploads = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { opportunityId } = req.params;

        if (!user.organizationId) {
            return res.status(400).json({
                success: false,
                error: "Organization ID is required",
            });
        }

        const uploadRepo = AppDataSource.getRepository(DocumentUpload);

        const uploads = await uploadRepo.find({
            where: {
                opportunityId,
                uploadSession: {
                    organization: { organisationId: user.organizationId },
                },
            },
            relations: ["uploadSession", "requirement", "sharepointDocument"],
            order: {
                createdAt: "DESC",
            },
        });

        res.json({
            success: true,
            data: uploads,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

export default {
    createUploadSession,
    getUploadSessionDetails,
    getOpportunitySessions,
    createRequirement,
    getOpportunityRequirements,
    updateRequirement,
    deleteRequirement,
    getOpportunityUploads,
};
