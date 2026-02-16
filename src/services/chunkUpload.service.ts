import { AppDataSource } from "../data-source";
import { DocumentUpload, UploadStatus } from "../entity/DocumentUpload";
import { UploadChunk } from "../entity/UploadChunk";
import { EntityManager } from "typeorm";
import { ValidationFailedError, ResourceNotFoundError } from "../common/errors";
import { v4 as uuidv4 } from "uuid";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

interface ChunkUploadResult {
    uploadId: string;
    chunkIndex: number;
    bytesWritten: number;
    uploadedChunks: number;
    totalChunks: number;
    progress: number;
}

class ChunkUploadService {
    private uploadDir = process.env.TEMP_UPLOAD_DIR || "C:/tmp/uploads";

    /**
     * Initialize upload (create DocumentUpload record)
     */
    async initializeUpload(
        uploadSessionId: string,
        fileName: string,
        fileSize: number,
        fileType: string,
        totalChunks: number,
        requirementId: string | null,
        opportunityId: string,
        transactionEntityManager: EntityManager
    ): Promise<DocumentUpload> {
        const uploadRepo = transactionEntityManager.getRepository(DocumentUpload);

        // Check if upload already exists for this requirement
        if (requirementId) {
            const existingUpload = await uploadRepo.findOne({
                where: {
                    uploadSessionId,
                    requirementId,
                },
            });

            if (existingUpload) {
                // Return existing upload for resume
                return existingUpload;
            }
        }

        const upload = new DocumentUpload({
            uploadId: uuidv4(),
            uploadSessionId,
            requirementId,
            opportunityId,
            fileName,
            fileSize,
            fileType,
            totalChunks,
            uploadedChunks: 0,
            uploadStatus: UploadStatus.PENDING,
            retryCount: 0,
        } as DocumentUpload);

        const savedUpload = await uploadRepo.save(upload);
        return savedUpload;
    }

    /**
     * Save chunk record after Multer saves file to disk
     */
    async saveChunkRecord(
        uploadId: string,
        chunkIndex: number,
        chunkHash: string,
        chunkSize: number,
        storagePath: string,
        transactionEntityManager: EntityManager
    ): Promise<ChunkUploadResult> {
        const uploadRepo = transactionEntityManager.getRepository(DocumentUpload);
        const chunkRepo = transactionEntityManager.getRepository(UploadChunk);

        // Check if chunk already exists (idempotency)
        const existingChunk = await chunkRepo.findOne({
            where: {
                uploadId,
                chunkIndex,
            },
        });

        if (existingChunk) {
            // Chunk already uploaded, return current progress
            const upload = await uploadRepo.findOne({ where: { uploadId } });
            if (!upload) {
                throw new ResourceNotFoundError("Upload not found");
            }

            return {
                uploadId,
                chunkIndex,
                bytesWritten: chunkSize,
                uploadedChunks: upload.uploadedChunks,
                totalChunks: upload.totalChunks,
                progress: (upload.uploadedChunks / upload.totalChunks) * 100,
            };
        }

        // Save chunk record
        const chunk = new UploadChunk({
            chunkId: uuidv4(),
            uploadId,
            chunkIndex,
            chunkSize,
            chunkHash,
            storagePath,
        } as UploadChunk);

        await chunkRepo.save(chunk);

        // Update upload progress
        const upload = await uploadRepo.findOne({ where: { uploadId } });
        if (!upload) {
            throw new ResourceNotFoundError("Upload not found");
        }

        upload.uploadedChunks += 1;
        upload.uploadStatus = UploadStatus.UPLOADING;

        await uploadRepo.save(upload);

        return {
            uploadId,
            chunkIndex,
            bytesWritten: chunkSize,
            uploadedChunks: upload.uploadedChunks,
            totalChunks: upload.totalChunks,
            progress: (upload.uploadedChunks / upload.totalChunks) * 100,
        };
    }

    /**
     * Calculate file hash from disk
     */
    async calculateFileHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash("sha256");
            const stream = fs.createReadStream(filePath);

            stream.on("data", (data: Buffer) => hash.update(data as crypto.BinaryLike));
            stream.on("end", () => resolve(hash.digest("hex")));
            stream.on("error", reject);
        });
    }

    /**
     * Assemble chunks into final file
     */
    async assembleChunks(
        uploadId: string,
        transactionEntityManager: EntityManager
    ): Promise<string> {
        const uploadRepo = transactionEntityManager.getRepository(DocumentUpload);
        const chunkRepo = transactionEntityManager.getRepository(UploadChunk);

        const upload = await uploadRepo.findOne({ where: { uploadId } });
        if (!upload) {
            throw new ResourceNotFoundError("Upload not found");
        }

        // Verify all chunks uploaded
        if (upload.uploadedChunks !== upload.totalChunks) {
            throw new ValidationFailedError(
                `Missing chunks: ${upload.uploadedChunks}/${upload.totalChunks} uploaded`
            );
        }

        // Get all chunks in order
        const chunks = await chunkRepo.find({
            where: { uploadId },
            order: { chunkIndex: "ASC" },
        });

        if (chunks.length !== upload.totalChunks) {
            throw new ValidationFailedError("Chunk count mismatch");
        }

        // Assemble file
        const finalFilePath = path.join(this.uploadDir, `${uploadId}_${upload.fileName}`);
        const writeStream = fs.createWriteStream(finalFilePath);

        for (const chunk of chunks) {
            const chunkData = fs.readFileSync(chunk.storagePath);
            writeStream.write(chunkData);
        }

        writeStream.end();

        // Wait for write to complete
        await new Promise<void>((resolve, reject) => {
            writeStream.on("finish", () => resolve());
            writeStream.on("error", reject);
        });

        // Calculate final file checksum
        const fileChecksum = await this.calculateFileHash(finalFilePath);

        // Update upload record
        upload.tempFilePath = finalFilePath;
        upload.fileChecksum = fileChecksum;
        upload.uploadStatus = UploadStatus.PROCESSING;

        await uploadRepo.save(upload);

        // Delete chunk files
        for (const chunk of chunks) {
            try {
                fs.unlinkSync(chunk.storagePath);
            } catch (error) {
                console.warn(`Failed to delete chunk file: ${chunk.storagePath}`, error);
            }
        }

        return finalFilePath;
    }

    /**
     * Get upload progress
     */
    async getUploadProgress(uploadId: string): Promise<{
        uploadedChunks: number;
        totalChunks: number;
        progress: number;
        status: UploadStatus;
    }> {
        const uploadRepo = AppDataSource.getRepository(DocumentUpload);

        const upload = await uploadRepo.findOne({ where: { uploadId } });
        if (!upload) {
            throw new ResourceNotFoundError("Upload not found");
        }

        return {
            uploadedChunks: upload.uploadedChunks,
            totalChunks: upload.totalChunks,
            progress: (upload.uploadedChunks / upload.totalChunks) * 100,
            status: upload.uploadStatus,
        };
    }

    /**
     * Get uploaded chunks for resume
     */
    async getUploadedChunks(uploadId: string): Promise<number[]> {
        const chunkRepo = AppDataSource.getRepository(UploadChunk);

        const chunks = await chunkRepo.find({
            where: { uploadId },
            select: ["chunkIndex"],
            order: { chunkIndex: "ASC" },
        });

        return chunks.map((c) => c.chunkIndex);
    }
}

export default ChunkUploadService;
