import { Client } from "@microsoft/microsoft-graph-client";
import { MicrosoftEmailAuthService } from "./microsoftEmailAuth.service";
import { MicrosoftEmailConfig } from "../config/microsoft-email.config";
import { AppDataSource } from "../data-source";
import { SentEmailLog, EmailType, EmailStatus } from "../entity/SentEmailLog";
import { Lead } from "../entity/Lead";
import { Oppurtunity } from "../entity/Oppurtunity";
import { Contact } from "../entity/Contact";
import { UploadSession } from "../entity/UploadSession";
import { User } from "../entity/User";
import { EmailTemplateService } from "./emailTemplate.service";
import { queueEmail, queueTemplateEmail } from "../queues/emailNotification.queue";

/**
 * Email Send Data Interface
 */
export interface EmailSendData {
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
    sentById?: string; // Optional - if not provided, will be set to null
    organizationId?: string;
}

/**
 * Core Email Notification Service
 * Handles sending notification emails via Microsoft Graph API (using BullMQ queue)
 */
export class EmailNotificationService {
    private authService = new MicrosoftEmailAuthService();
    private sentEmailLogRepository = AppDataSource.getRepository(SentEmailLog);
    private leadRepository = AppDataSource.getRepository(Lead);
    private opportunityRepository = AppDataSource.getRepository(Oppurtunity);
    private contactRepository = AppDataSource.getRepository(Contact);
    private uploadSessionRepository = AppDataSource.getRepository(UploadSession);
    private userRepository = AppDataSource.getRepository(User);

    /**
     * Get an authenticated Microsoft Graph client using Service Principal
     */
    private async getGraphClient(): Promise<Client> {
        const accessToken = await this.authService.getAccessToken();

        return Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            }
        });
    }

    /**
     * Send email via BullMQ queue (asynchronous)
     * @param emailData - Email data including recipients, subject, body
     * @returns Job ID for tracking
     */
    async sendEmail(emailData: EmailSendData): Promise<{ jobId: string; message: string }> {
        try {
            // Queue the email for background processing
            const jobId = await queueEmail({
                fromMailbox: emailData.fromMailbox,
                to: emailData.to,
                cc: emailData.cc,
                subject: emailData.subject,
                bodyHtml: emailData.bodyHtml,
                bodyText: emailData.bodyText,
                emailType: emailData.emailType,
                leadId: emailData.leadId,
                opportunityId: emailData.opportunityId,
                contactId: emailData.contactId,
                uploadSessionId: emailData.uploadSessionId,
                sentById: emailData.sentById || null, // Use null if not provided
                organizationId: emailData.organizationId
            });

            console.log(`✓ Email queued successfully: Job ID ${jobId}`);

            return {
                jobId,
                message: 'Email queued for sending'
            };

        } catch (error: any) {
            console.error('Error queuing email:', error);
            throw new Error(`Failed to queue email: ${error.message}`);
        }
    }

    /**
     * Send email using template (via queue)
     * @param templateCode - Template code (e.g., NEW_LEAD_ADMIN)
     * @param entityType - Entity type (LEAD, OPPORTUNITY, etc.)
     * @param entityId - Entity ID
     * @param recipientOverride - Optional recipient override
     * @param sentById - User ID who triggered the email
     * @returns Job ID for tracking
     */
    async sendTemplateEmail(
        templateCode: string,
        entityType: string,
        entityId: string,
        sentById: string,
        recipientOverride?: string[],
        organizationId?: string
    ): Promise<{ jobId: string; message: string }> {
        try {
            // Queue the template email for background processing
            const jobId = await queueTemplateEmail({
                templateCode,
                entityType,
                entityId,
                sentById,
                recipientOverride,
                organizationId
            });

            console.log(`✓ Template email queued successfully: Job ID ${jobId}`);

            return {
                jobId,
                message: 'Template email queued for sending'
            };

        } catch (error: any) {
            console.error('Error queuing template email:', error);
            throw new Error(`Failed to queue template email: ${error.message}`);
        }
    }

    /**
     * Send new lead notification to admin/manager (via queue)
     */
    async sendNewLeadNotification(leadId: string, sentById?: string): Promise<{ jobId: string; message: string }> {
        const lead = await this.leadRepository.findOne({
            where: { leadId },
            relations: ['owner', 'organization']
        });

        if (!lead) {
            throw new Error(`Lead not found: ${leadId}`);
        }

        const userId = sentById || lead.owner?.userId || 'system';
        const orgId = lead.organization?.organisationId;

        return await this.sendTemplateEmail(
            'NEW_LEAD_ADMIN',
            'LEAD',
            leadId,
            userId,
            undefined, // Use template default recipients
            orgId
        );
    }

    /**
     * Send lead conversion notification (via queue)
     */
    async sendLeadConversionNotification(
        opportunityId: string,
        _previousLeadId: string,  // Prefixed with underscore to indicate intentionally unused
        sentById?: string
    ): Promise<{ jobId: string; message: string }> {
        const opportunity = await this.opportunityRepository.findOne({
            where: { opportunityId },
            relations: ['owner', 'organization']
        });

        if (!opportunity) {
            throw new Error(`Opportunity not found: ${opportunityId}`);
        }

        const userId = sentById || opportunity.owner?.userId || 'system';
        const orgId = opportunity.organization?.organisationId;

        return await this.sendTemplateEmail(
            'LEAD_CONVERTED',
            'OPPORTUNITY',
            opportunityId,
            userId,
            undefined,
            orgId
        );
    }

    /**
     * Send closure notification (via queue)
     */
    async sendClosureNotification(
        entityType: 'LEAD' | 'OPPORTUNITY',
        entityId: string,
        _reason: string,  // Prefixed with underscore to indicate intentionally unused (could be used in template variables later)
        sentById?: string
    ): Promise<{ jobId: string; message: string }> {
        const templateCode = entityType === 'LEAD' ? 'LEAD_CLOSED' : 'OPPORTUNITY_CLOSED';

        let userId = sentById || 'system';
        let orgId: string | undefined;

        if (entityType === 'LEAD') {
            const lead = await this.leadRepository.findOne({
                where: { leadId: entityId },
                relations: ['owner', 'organization']
            });
            if (lead) {
                userId = sentById || lead.owner?.userId || 'system';
                orgId = lead.organization?.organisationId;
            }
        } else {
            const opportunity = await this.opportunityRepository.findOne({
                where: { opportunityId: entityId },
                relations: ['owner', 'organization']
            });
            if (opportunity) {
                userId = sentById || opportunity.owner?.userId || 'system';
                orgId = opportunity.organization?.organisationId;
            }
        }

        return await this.sendTemplateEmail(
            templateCode,
            entityType,
            entityId,
            userId,
            undefined,
            orgId
        );
    }

    /**
     * Send document link email to customer (via queue)
     */
    async sendDocumentLinkEmail(
        uploadSessionId: string,
        customerEmail: string,
        sentById: string
    ): Promise<{ jobId: string; message: string }> {
        const uploadSession = await this.uploadSessionRepository.findOne({
            where: { uploadSessionId },
            relations: ['opportunity']
        });

        if (!uploadSession) {
            throw new Error(`Upload session not found: ${uploadSessionId}`);
        }

        return await this.sendTemplateEmail(
            'DOCUMENT_LINK_CUSTOMER',
            'DOCUMENT_LINK',
            uploadSessionId,
            sentById,
            [customerEmail], // Override recipient
            uploadSession.opportunity?.organization?.organisationId
        );
    }
}
