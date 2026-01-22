import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { AppDataSource } from '../data-source';
import { SentEmailLog, EmailStatus, EmailType } from '../entity/SentEmailLog';
import { Client } from '@microsoft/microsoft-graph-client';
import { MicrosoftEmailAuthService } from '../services/microsoftEmailAuth.service';
import { MicrosoftEmailConfig } from '../config/microsoft-email.config';
import { EmailTemplateService } from '../services/emailTemplate.service';
import { EmailJobData, TemplateEmailJobData } from '../queues/emailNotification.queue';

// Redis connection
const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
});

// Initialize services
const authService = new MicrosoftEmailAuthService();
const sentEmailLogRepository = AppDataSource.getRepository(SentEmailLog);
const templateService = new EmailTemplateService();

/**
 * Get authenticated Microsoft Graph client
 */
async function getGraphClient(): Promise<Client> {
    const accessToken = await authService.getAccessToken();
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });
}

/**
 * Send email via Microsoft Graph API
 */
async function sendEmailViaGraph(emailData: EmailJobData): Promise<{ success: boolean; messageId?: string }> {
    const fromMailbox = emailData.fromMailbox || MicrosoftEmailConfig.DEFAULT_FROM_MAILBOX;
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];

    const message = {
        message: {
            subject: emailData.subject,
            body: {
                contentType: 'HTML',
                content: emailData.bodyHtml
            },
            toRecipients: recipients.map(email => ({
                emailAddress: { address: email }
            })),
            ...(emailData.cc && emailData.cc.length > 0 && {
                ccRecipients: emailData.cc.map(email => ({
                    emailAddress: { address: email }
                }))
            })
        },
        saveToSentItems: true
    };

    const client = await getGraphClient();
    const response = await client.api(`/users/${fromMailbox}/sendMail`).post(message);

    return {
        success: true,
        messageId: response?.id || undefined
    };
}

/**
 * Create sent email log in database
 */
async function createSentEmailLog(data: EmailJobData, status: EmailStatus, messageId?: string, errorMessage?: string): Promise<SentEmailLog> {
    const recipients = Array.isArray(data.to) ? data.to.join(', ') : data.to;

    const sentEmailLog = new SentEmailLog({
        recipient: recipients,
        ccRecipients: data.cc ? JSON.stringify(data.cc) : undefined,
        subject: data.subject,
        bodyPreview: data.bodyHtml?.substring(0, 100) || '',
        bodyHtml: data.bodyHtml,
        fromMailbox: data.fromMailbox || MicrosoftEmailConfig.DEFAULT_FROM_MAILBOX,
        emailType: data.emailType || EmailType.CUSTOM,
        status,
        errorMessage,
        microsoftMessageId: messageId,
        sentAt: new Date(),
        leadId: data.leadId,
        opportunityId: data.opportunityId,
        contactId: data.contactId,
        uploadSessionId: data.uploadSessionId,
        templateId: data.templateId,
        sentById: data.sentById,
        organizationId: data.organizationId
    });

    sentEmailLog.encrypt();
    return await sentEmailLogRepository.save(sentEmailLog);
}

/**
 * Email notification worker
 * Processes email sending jobs in the background
 */
const emailNotificationWorker = new Worker(
    'email-notification',
    async (job: Job) => {
        console.log(`📧 Processing email job ${job.id}: ${job.name}`);

        try {
            if (job.name === 'send-email') {
                // Direct email send
                const emailData = job.data as EmailJobData;

                await job.updateProgress(20);

                const result = await sendEmailViaGraph(emailData);

                await job.updateProgress(80);

                // Log success
                await createSentEmailLog(emailData, EmailStatus.SENT, result.messageId);

                await job.updateProgress(100);

                console.log(` Email sent successfully: ${job.id}`);
                return { success: true, messageId: result.messageId };

            } else if (job.name === 'send-template-email') {
                // Template-based email send
                const templateData = job.data as TemplateEmailJobData;

                await job.updateProgress(10);

                // Get template
                const template = await templateService.getTemplateByCode(
                    templateData.templateCode,
                    templateData.organizationId
                );

                if (!template) {
                    throw new Error(`Template not found: ${templateData.templateCode}`);
                }

                await job.updateProgress(30);

                // Get variables and render template
                const variables = await templateService.getTemplateVariablesForEntity(
                    templateData.entityType,
                    templateData.entityId
                );

                const rendered = templateService.renderTemplate(template, variables);

                await job.updateProgress(50);

                // Determine recipients
                let recipients: string[] = templateData.recipientOverride || [];
                if (recipients.length === 0 && template.defaultRecipients) {
                    try {
                        recipients = JSON.parse(template.defaultRecipients);
                    } catch {
                        recipients = [];
                    }
                }

                if (recipients.length === 0) {
                    throw new Error('No recipients specified and template has no default recipients');
                }

                // Build email data
                const emailData: EmailJobData = {
                    to: recipients,
                    subject: rendered.subject,
                    bodyHtml: rendered.bodyHtml,
                    bodyText: rendered.bodyText,
                    emailType: getEmailTypeFromEntityType(templateData.entityType),
                    leadId: templateData.entityType === 'LEAD' ? templateData.entityId : undefined,
                    opportunityId: templateData.entityType === 'OPPORTUNITY' ? templateData.entityId : undefined,
                    contactId: templateData.entityType === 'CONTACT' ? templateData.entityId : undefined,
                    uploadSessionId: templateData.entityType === 'DOCUMENT_LINK' ? templateData.entityId : undefined,
                    templateId: template.templateId,
                    sentById: templateData.sentById,
                    organizationId: templateData.organizationId
                };

                await job.updateProgress(60);

                // Send email
                const result = await sendEmailViaGraph(emailData);

                await job.updateProgress(90);

                // Log success
                await createSentEmailLog(emailData, EmailStatus.SENT, result.messageId);

                await job.updateProgress(100);

                console.log(` Template email sent successfully: ${job.id}`);
                return { success: true, messageId: result.messageId };
            }

            throw new Error(`Unknown job type: ${job.name}`);

        } catch (error: any) {
            console.error(` Email job ${job.id} failed:`, error.message);

            // Log failure
            if (job.name === 'send-email') {
                await createSentEmailLog(
                    job.data as EmailJobData,
                    EmailStatus.FAILED,
                    undefined,
                    error.message
                );
            }

            throw error;
        }
    },
    {
        connection,
        concurrency: 3, // Process 3 emails concurrently
    }
);

/**
 * Map entity type to email type
 */
function getEmailTypeFromEntityType(entityType: string): EmailType {
    switch (entityType) {
        case 'LEAD':
            return EmailType.LEAD_NOTIFICATION;
        case 'OPPORTUNITY':
            return EmailType.OPPORTUNITY_NOTIFICATION;
        case 'DOCUMENT_LINK':
            return EmailType.DOCUMENT_LINK;
        default:
            return EmailType.CUSTOM;
    }
}

// Worker event listeners
emailNotificationWorker.on('completed', (job) => {
    console.log(`✅ Email worker completed job ${job.id}`);
});

emailNotificationWorker.on('failed', (job, error) => {
    console.error(` Email worker failed job ${job?.id}:`, error.message);
});

emailNotificationWorker.on('error', (error) => {
    console.error(' Email worker error:', error);
});

console.log('✓ Email notification worker started');

export default emailNotificationWorker;
