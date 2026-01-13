import { Queue } from "bullmq";
import Redis from "ioredis";

// Redis connection
const connection = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,
});

// SharePoint upload queue
export const sharepointUploadQueue = new Queue("sharepoint-upload", {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 5000, // Start with 5s, then 10s, 20s, 40s, 80s
        },
        removeOnComplete: {
            age: 24 * 60 * 60, // Keep completed jobs for 24 hours
            count: 1000,
        },
        removeOnFail: {
            age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
        },
    },
});

// Add job to queue
export async function queueSharePointUpload(uploadId: string) {
    await sharepointUploadQueue.add(
        "upload-to-sharepoint",
        { uploadId },
        {
            jobId: uploadId, // Prevents duplicate jobs
        }
    );
}

// Queue event listeners
sharepointUploadQueue.on("error", (error) => {
    console.error("SharePoint upload queue error:", error);
});

sharepointUploadQueue.on("waiting", (jobId) => {
    console.log(`Job ${jobId} is waiting`);
});

sharepointUploadQueue.on("active" as any, (job: any) => {
    console.log(`Job ${job.id} is now active`);
});

sharepointUploadQueue.on("completed" as any, (job: any) => {
    console.log(`Job ${job.id} completed successfully`);
});

sharepointUploadQueue.on("failed" as any, (job: any, error: Error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
});

export default sharepointUploadQueue;
