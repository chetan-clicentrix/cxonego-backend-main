import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { AppDataSource } from "../data-source";
import { DocumentUpload, UploadStatus } from "../entity/DocumentUpload";
import { SharePointService } from "../services/sharepoint.service";
import * as fs from "fs";

// Redis connection
const connection = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,
});

// SharePoint upload worker
const sharepointUploadWorker = new Worker(
    "sharepoint-upload",
    async (job: Job) => {
        const { uploadId } = job.data;

        console.log(`Processing SharePoint upload for uploadId: ${uploadId}`);

        const uploadRepo = AppDataSource.getRepository(DocumentUpload);
        const sharepointService = new SharePointService();

        try {
            // Get upload record
            const upload = await uploadRepo.findOne({
                where: { uploadId },
                relations: ["uploadSession", "uploadSession.opportunity"],
            });

            if (!upload) {
                throw new Error(`Upload not found: ${uploadId}`);
            }

            if (!upload.tempFilePath) {
                throw new Error(`Temp file path not set for upload: ${uploadId}`);
            }

            // Verify file exists
            if (!fs.existsSync(upload.tempFilePath)) {
                throw new Error(`Temp file not found: ${upload.tempFilePath}`);
            }

            // Update status to processing
            await job.updateProgress(10);
            upload.uploadStatus = UploadStatus.PROCESSING;
            await uploadRepo.save(upload);

            // Upload to SharePoint
            const opportunityId = upload.uploadSession.opportunity.opportunityId;
            const userId = upload.uploadSession.modifiedBy || "system-public-upload";

            await job.updateProgress(50);

            const sharepointDoc = await sharepointService.uploadFromTempFile(
                upload.tempFilePath,
                upload.fileName,
                opportunityId,
                upload.uploadSessionId,
                userId
            );

            await job.updateProgress(90);

            // Update upload record
            upload.uploadStatus = UploadStatus.COMPLETED;
            upload.sharepointDocumentId = sharepointDoc.sharepointDocumentId;
            await uploadRepo.save(upload);

            // Delete temp file
            try {
                fs.unlinkSync(upload.tempFilePath);
            } catch (error) {
                console.warn(`Failed to delete temp file: ${upload.tempFilePath}`, error);
            }

            await job.updateProgress(100);

            console.log(`SharePoint upload completed for uploadId: ${uploadId}`);

            return { success: true, sharepointDocumentId: sharepointDoc.sharepointDocumentId };
        } catch (error: any) {
            console.error(`SharePoint upload failed for uploadId: ${uploadId}`, error);

            // Update upload record with error
            const upload = await uploadRepo.findOne({ where: { uploadId } });
            if (upload) {
                upload.uploadStatus = UploadStatus.FAILED;
                upload.errorMessage = error.message;
                upload.retryCount += 1;
                await uploadRepo.save(upload);
            }

            throw error;
        }
    },
    {
        connection: connection as any,
        concurrency: 5, // Process 5 uploads concurrently
    }
);

// Worker event listeners
sharepointUploadWorker.on("completed", (job) => {
    console.log(`Worker completed job ${job.id}`);
});

sharepointUploadWorker.on("failed", (job, error) => {
    console.error(`Worker failed job ${job?.id}:`, error.message);
});

sharepointUploadWorker.on("error", (error) => {
    console.error("Worker error:", error);

});

export default sharepointUploadWorker;
