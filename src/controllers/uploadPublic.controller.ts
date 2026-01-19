import { Request, Response } from "express";
import UploadSessionService from "../services/uploadSession.service";
import DocumentRequirementService from "../services/documentRequirement.service";
import ChunkUploadService from "../services/chunkUpload.service";
import { AppDataSource } from "../data-source";
import { queueSharePointUpload } from "../queues/sharepointUpload.queue";
import * as path from "path";

const uploadSessionService = new UploadSessionService();
const documentRequirementService = new DocumentRequirementService();
const chunkUploadService = new ChunkUploadService();

/**
 * Get upload session details and requirements (public endpoint)
 * GET /api/public/upload/:sessionToken
 */
export const getUploadSession = async (req: Request, res: Response) => {
    try {
        const { sessionToken } = req.params;

        // Validate session
        const session = await uploadSessionService.validateSession(sessionToken);

        // Get document requirements
        const requirements = await documentRequirementService.getRequirementsByOpportunity(
            session.opportunityId,
            { organizationId: session.organization.organisationId } as any
        );

        // Track metadata
        const ipAddress = req.ip || req.socket.remoteAddress || "";
        const userAgent = req.get("user-agent") || "";
        await uploadSessionService.trackSessionMetadata(sessionToken, ipAddress, userAgent);

        res.json({
            success: true,
            data: {
                uploadSessionId: session.uploadSessionId,
                sessionToken: session.sessionToken,
                opportunityId: session.opportunityId,
                expiresAt: session.expiresAt,
                status: session.status,
                requirements: requirements.map((req) => ({
                    requirementId: req.requirementId,
                    documentName: req.documentName,
                    documentType: req.documentType,
                    description: req.description,
                    isRequired: req.isRequired,
                    allowedFileTypes: req.allowedFileTypes,
                    maxFileSize: req.maxFileSize,
                    displayOrder: req.displayOrder,
                })),
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
 * Initialize upload (create DocumentUpload record)
 * POST /api/public/upload/:sessionToken/init
 */
export const initializeUpload = async (req: Request, res: Response) => {
    try {
        const { sessionToken } = req.params;
        const { fileName, fileSize, fileType, totalChunks, requirementId } = req.body;

        // Validate session
        const session = await uploadSessionService.validateSession(sessionToken);

        // Validate file size
        const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "20971520");
        if (fileSize > maxFileSize) {
            return res.status(400).json({
                success: false,
                error: `File size exceeds maximum allowed size of ${maxFileSize} bytes`,
            });
        }

        // Initialize upload
        const upload = await AppDataSource.transaction(async (manager) => {
            return await chunkUploadService.initializeUpload(
                session.uploadSessionId,
                fileName,
                fileSize,
                fileType,
                totalChunks,
                requirementId || null,
                session.opportunityId,
                manager
            );
        });

        res.json({
            success: true,
            data: {
                uploadId: upload.uploadId,
                fileName: upload.fileName,
                totalChunks: upload.totalChunks,
                uploadedChunks: upload.uploadedChunks,
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
 * Upload chunk (uses Multer middleware)
 * POST /api/public/upload/:sessionToken/chunk
 */
export const uploadChunk = async (req: Request, res: Response) => {
    console.log("uploadChunk controller CALLED!");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    try {
        const { sessionToken } = req.params;
        const { uploadId, chunkIndex, chunkHash } = req.body;

        // Validate session
        await uploadSessionService.validateSession(sessionToken);

        // Validate file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded",
            });
        }


        // Verify chunk hash
        const actualHash = await chunkUploadService.calculateFileHash(req.file.path);
        if (actualHash !== chunkHash) {
            // Delete invalid chunk
            const fs = await import("fs/promises");
            await fs.unlink(req.file.path);

            return res.status(400).json({
                success: false,
                error: "Chunk hash mismatch - file may be corrupted",
            });
        }


        // Save chunk record
        const result = await AppDataSource.transaction(async (manager) => {
            return await chunkUploadService.saveChunkRecord(
                uploadId,
                parseInt(chunkIndex),
                chunkHash,
                req.file!.size,
                req.file!.path,
                manager
            );
        });

        // Check if upload is complete
        if (result.uploadedChunks === result.totalChunks) {
            // Assemble chunks and queue for SharePoint upload
            await AppDataSource.transaction(async (manager) => {
                const finalFilePath = await chunkUploadService.assembleChunks(uploadId, manager);
                console.log(`File assembled: ${finalFilePath}`);

                // Queue SharePoint upload
                await queueSharePointUpload(uploadId);
            });
        }

        res.json({
            success: true,
            data: {
                uploadId: result.uploadId,
                chunkIndex: result.chunkIndex,
                uploadedChunks: result.uploadedChunks,
                totalChunks: result.totalChunks,
                progress: result.progress,
                isComplete: result.uploadedChunks === result.totalChunks,
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
 * Get upload progress
 * GET /api/public/upload/:sessionToken/progress/:uploadId
 */
export const getUploadProgress = async (req: Request, res: Response) => {
    try {
        const { sessionToken, uploadId } = req.params;

        // Validate session
        await uploadSessionService.validateSession(sessionToken);

        // Get progress
        const progress = await chunkUploadService.getUploadProgress(uploadId);

        res.json({
            success: true,
            data: progress,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get uploaded chunks (for resume)
 * GET /api/public/upload/:sessionToken/chunks/:uploadId
 */
export const getUploadedChunks = async (req: Request, res: Response) => {
    try {
        const { sessionToken, uploadId } = req.params;

        // Validate session
        await uploadSessionService.validateSession(sessionToken);

        // Get uploaded chunks
        const chunks = await chunkUploadService.getUploadedChunks(uploadId);

        res.json({
            success: true,
            data: {
                uploadId,
                uploadedChunks: chunks,
            },
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

export default {
    getUploadSession,
    initializeUpload,
    uploadChunk,
    getUploadProgress,
    getUploadedChunks,
};
