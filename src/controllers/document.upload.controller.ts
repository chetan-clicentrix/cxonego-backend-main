import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { DocumentUpload } from "../entity/DocumentUpload";
import { userInfo } from "../interfaces/types";

/**
 * Get all uploaded documents for an opportunity
 */
export const getDocuments = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { opportunityId } = req.query;

        if (!opportunityId) {
            return res.status(400).json({
                success: false,
                error: "opportunityId is required",
            });
        }

        if (!user.organizationId) {
            return res.status(400).json({
                success: false,
                error: "Organization ID is required",
            });
        }

        const uploadRepo = AppDataSource.getRepository(DocumentUpload);



        // First, try to find ANY uploads for this opportunity (debug)
        const allUploads = await uploadRepo.find({
            where: {
                opportunityId: opportunityId as string,
            },
            relations: ["uploadSession", "requirement", "sharepointDocument"],
        });

        console.log(`Found ${allUploads.length} total uploads for opportunity ${opportunityId}`);

        if (allUploads.length > 0) {
            console.log("Sample upload:", {
                uploadId: allUploads[0].uploadId,
                fileName: allUploads[0].fileName,
                opportunityId: allUploads[0].opportunityId,
                sessionOrgId: allUploads[0].uploadSession?.organization?.organisationId,
            });
        }

        // Filter by organization
        const uploads = allUploads.filter(
            (upload) => upload.uploadSession?.organization?.organisationId === user.organizationId
        );

        console.log(`After org filter: ${uploads.length} uploads`);

        // Sort by created date
        uploads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Format response with document type information
        const documents = uploads.map((upload) => ({
            documentId: upload.uploadId,
            fileName: upload.fileName,
            fileSize: upload.fileSize,
            fileType: upload.fileType,
            uploadStatus: upload.uploadStatus,
            uploadedAt: upload.createdAt,

            // Document type information from requirement
            documentType: upload.requirement?.documentType || "OTHER",
            documentName: upload.requirement?.documentName || "Unknown Document",
            documentDescription: upload.requirement?.description,
            isRequired: upload.requirement?.isRequired,

            // SharePoint information
            sharepointUrl: upload.sharepointDocument?.sharepointLink,
            sharepointDocumentId: upload.sharepointDocumentId,

            // Upload session info
            sessionId: upload.uploadSessionId,
            sessionStatus: upload.uploadSession?.status,

            // Error info if failed
            errorMessage: upload.errorMessage,
            retryCount: upload.retryCount,
        }));

        res.json({
            success: true,
            data: {
                opportunityId,
                totalDocuments: documents.length,
                documents,
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
 * Delete an uploaded document
 * DELETE /api/v1/documents/:uploadId
 */
export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { uploadId } = req.params;

        if (!user.organizationId) {
            return res.status(400).json({
                success: false,
                error: "Organization ID is required",
            });
        }

        const uploadRepo = AppDataSource.getRepository(DocumentUpload);

        // Find the upload
        const upload = await uploadRepo.findOne({
            where: { uploadId },
            relations: ["uploadSession", "chunks", "sharepointDocument"],
        });

        if (!upload) {
            return res.status(404).json({
                success: false,
                error: "Document not found",
            });
        }

        // Verify organization ownership
        if (upload.uploadSession?.organization?.organisationId !== user.organizationId) {
            return res.status(403).json({
                success: false,
                error: "You don't have permission to delete this document",
            });
        }

        console.log(`Deleting document: ${upload.fileName} (${uploadId})`);

        // Delete temp file if exists
        if (upload.tempFilePath) {
            try {
                const fs = await import("fs");
                if (fs.existsSync(upload.tempFilePath)) {
                    fs.unlinkSync(upload.tempFilePath);
                    console.log(`Deleted temp file: ${upload.tempFilePath}`);
                }
            } catch (error) {
                console.warn(`Failed to delete temp file: ${upload.tempFilePath}`, error);
            }
        }

        // Delete chunk files
        if (upload.chunks && upload.chunks.length > 0) {
            const fs = await import("fs");
            for (const chunk of upload.chunks) {
                try {
                    if (fs.existsSync(chunk.storagePath)) {
                        fs.unlinkSync(chunk.storagePath);
                        console.log(`Deleted chunk file: ${chunk.storagePath}`);
                    }
                } catch (error) {
                    console.warn(`Failed to delete chunk file: ${chunk.storagePath}`, error);
                }
            }
        }

        // TODO: Delete from SharePoint if needed
        // if (upload.sharepointDocumentId) {
        //     await sharepointService.deleteDocument(upload.sharepointDocumentId);
        // }

        // Delete the upload record (cascades to chunks)
        await uploadRepo.remove(upload);

        console.log(`Document deleted successfully: ${uploadId}`);

        res.json({
            success: true,
            message: "Document deleted successfully",
            data: {
                uploadId,
                fileName: upload.fileName,
            },
        });
    } catch (error: any) {
        console.error("Error deleting document:", error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};


/**
 * Delete multiple documents at once
 * POST /api/v1/documents/bulk-delete
 * Body: { "uploadIds": ["id1", "id2", "id3"] }
 */
export const bulkDeleteDocuments = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user as userInfo;
        const { uploadIds } = req.body;

        if (!user.organizationId) {
            return res.status(400).json({
                success: false,
                error: "Organization ID is required",
            });
        }

        if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: "uploadIds array is required and must not be empty",
            });
        }

        const uploadRepo = AppDataSource.getRepository(DocumentUpload);

        const results = {
            deleted: [] as string[],
            failed: [] as { uploadId: string; reason: string }[],
        };

        // Process each upload ID
        for (const uploadId of uploadIds) {
            try {
                // Find the upload
                const upload = await uploadRepo.findOne({
                    where: { uploadId },
                    relations: ["uploadSession", "chunks"],
                });

                if (!upload) {
                    results.failed.push({
                        uploadId,
                        reason: "Document not found",
                    });
                    continue;
                }

                // Verify organization ownership
                if (upload.uploadSession?.organization?.organisationId !== user.organizationId) {
                    results.failed.push({
                        uploadId,
                        reason: "No permission to delete this document",
                    });
                    continue;
                }

                console.log(`Deleting document: ${upload.fileName} (${uploadId})`);

                // Delete temp file if exists
                if (upload.tempFilePath) {
                    try {
                        const fs = await import("fs");
                        if (fs.existsSync(upload.tempFilePath)) {
                            fs.unlinkSync(upload.tempFilePath);
                        }
                    } catch (error) {
                        console.warn(`Failed to delete temp file: ${upload.tempFilePath}`, error);
                    }
                }

                // Delete chunk files
                if (upload.chunks && upload.chunks.length > 0) {
                    const fs = await import("fs");
                    for (const chunk of upload.chunks) {
                        try {
                            if (fs.existsSync(chunk.storagePath)) {
                                fs.unlinkSync(chunk.storagePath);
                            }
                        } catch (error) {
                            console.warn(`Failed to delete chunk file: ${chunk.storagePath}`, error);
                        }
                    }
                }

                // Delete the upload record
                await uploadRepo.remove(upload);

                results.deleted.push(uploadId);
                console.log(`Document deleted successfully: ${uploadId}`);
            } catch (error: any) {
                console.error(`Error deleting document ${uploadId}:`, error);
                results.failed.push({
                    uploadId,
                    reason: error.message || "Unknown error",
                });
            }
        }

        res.json({
            success: true,
            message: `Deleted ${results.deleted.length} of ${uploadIds.length} documents`,
            data: {
                totalRequested: uploadIds.length,
                successCount: results.deleted.length,
                failedCount: results.failed.length,
                deleted: results.deleted,
                failed: results.failed,
            },
        });
    } catch (error: any) {
        console.error("Error in bulk delete:", error);
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

export default {
    getDocuments,
    deleteDocument,
    bulkDeleteDocuments,
};

