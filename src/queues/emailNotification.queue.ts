import { Queue } from 'bullmq';
import * as dotenv from 'dotenv';
import { EmailType } from '../entity/SentEmailLog';

dotenv.config();

// Email job data interface
export interface EmailJobData {
    fromMailbox?: string;
    to: string | string[];
    cc?: string[];
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    emailType?: EmailType;
    leadId?: string;
    opportunityId?: string;
    contactId?: string;
    uploadSessionId?: string;
    templateId?: string;
    sentById: string;
    organizationId?: string;
}

// Template email job data interface
export interface TemplateEmailJobData {
    templateCode: string;
    entityType: string;
    entityId: string;
    sentById: string;
    recipientOverride?: string[];
    organizationId?: string;
}

// Email notification queue configuration
export const emailNotificationQueue = new Queue('email-notification', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
    },
    defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 second delay, then 4s, 8s
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
});

console.log('✓ Email notification queue initialized');

/**
 * Add direct email job to queue
 */
export async function queueEmail(emailData: EmailJobData): Promise<string> {
    const job = await emailNotificationQueue.add('send-email', emailData, {
        priority: emailData.emailType === EmailType.CUSTOM ? 2 : 1, // Custom emails have lower priority
    });

    console.log(`📧 Email queued: ${job.id} - To: ${emailData.to}`);
    return job.id!;
}

/**
 * Add template-based email job to queue
 */
export async function queueTemplateEmail(templateData: TemplateEmailJobData): Promise<string> {
    const job = await emailNotificationQueue.add('send-template-email', templateData, {
        priority: 1, // Template emails are important (notifications)
    });

    console.log(`📧 Template email queued: ${job.id} - Template: ${templateData.templateCode}`);
    return job.id!;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
        emailNotificationQueue.getWaitingCount(),
        emailNotificationQueue.getActiveCount(),
        emailNotificationQueue.getCompletedCount(),
        emailNotificationQueue.getFailedCount(),
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
    };
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Closing email notification queue...');
    await emailNotificationQueue.close();
});
