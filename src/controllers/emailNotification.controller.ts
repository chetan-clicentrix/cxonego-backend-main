import { Request, Response } from 'express';
import { EmailNotificationService } from '../services/emailNotification.service';
import { EmailTemplateService } from '../services/emailTemplate.service';
import { AppDataSource } from '../data-source';
import { SentEmailLog } from '../entity/SentEmailLog';
import { decrypt } from '../common/utils';
import {
    sendEmailSchema,
    sendTemplateEmailSchema,
    sendDocumentLinkSchema,
    createTemplateSchema,
    updateTemplateSchema,
    templatePreviewSchema,
    sentEmailHistoryQuerySchema,
    templateListQuerySchema
} from '../schemas/emailNotification.schema';

/**
 * Email Notification Controller
 * Handles all email notification API endpoints
 */
export class EmailNotificationController {
    private emailService = new EmailNotificationService();
    private templateService = new EmailTemplateService();
    private sentEmailLogRepository = AppDataSource.getRepository(SentEmailLog);

    /**
     * Send direct email
     * POST /api/v1/email-notification/send
     */
    async sendEmail(req: Request, res: Response) {
        try {
            const validatedData = sendEmailSchema.parse(req.body);
            const userId = (req as any).user.userId; // From Firebase auth middleware

            const result = await this.emailService.sendEmail({
                ...validatedData,
                sentById: userId
            });

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    jobId: result.jobId
                }
            });
        } catch (error: any) {
            console.error('Error sending email:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to queue email',
                error: error.message
            });
        }
    }

    /**
     * Send template-based email
     * POST /api/v1/email-notification/send-template
     */
    async sendTemplateEmail(req: Request, res: Response) {
        try {
            const validatedData = sendTemplateEmailSchema.parse(req.body);
            const userId = (req as any).user.userId;
            const organizationId = (req as any).user.organization?.organisationId;

            const result = await this.emailService.sendTemplateEmail(
                validatedData.templateCode,
                validatedData.entityType,
                validatedData.entityId,
                userId,
                validatedData.recipientOverride,
                organizationId
            );

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    jobId: result.jobId
                }
            });
        } catch (error: any) {
            console.error('Error queuing template email:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to queue template email',
                error: error.message
            });
        }
    }

    /**
     * Send document link email to customer
     * POST /api/v1/email-notification/send-document-link
     */
    async sendDocumentLinkEmail(req: Request, res: Response) {
        try {
            const validatedData = sendDocumentLinkSchema.parse(req.body);
            const userId = (req as any).user.userId;

            const result = await this.emailService.sendDocumentLinkEmail(
                validatedData.uploadSessionId,
                validatedData.customerEmail,
                userId
            );

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    jobId: result.jobId
                }
            });
        } catch (error: any) {
            console.error('Error queuing document link email:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to queue document link email',
                error: error.message
            });
        }
    }

    /**
     * Get sent email history
     * GET /api/v1/email-notification/sent
     */
    async getSentEmails(req: Request, res: Response) {
        try {
            const query = sentEmailHistoryQuerySchema.parse(req.query);
            const userId = (req as any).user.userId;
            const organizationId = (req as any).user.organization?.organisationId;

            const skip = (query.page - 1) * query.limit;

            const queryBuilder = this.sentEmailLogRepository.createQueryBuilder('email')
                .leftJoinAndSelect('email.sentBy', 'sentBy')
                .leftJoinAndSelect('email.template', 'template')
                .where('email.organizationId = :organizationId', { organizationId })
                .orderBy('email.sentAt', 'DESC')
                .skip(skip)
                .take(query.limit);

            if (query.emailType) {
                queryBuilder.andWhere('email.emailType = :emailType', { emailType: query.emailType });
            }

            if (query.leadId) {
                queryBuilder.andWhere('email.leadId = :leadId', { leadId: query.leadId });
            }

            if (query.opportunityId) {
                queryBuilder.andWhere('email.opportunityId = :opportunityId', { opportunityId: query.opportunityId });
            }

            const [emails, total] = await queryBuilder.getManyAndCount();

            // Decrypt sensitive fields
            const decryptedEmails = emails.map(email => ({
                sentEmailId: email.sentEmailId,
                recipient: email.recipient ? decrypt(email.recipient) : '',
                subject: email.subject ? decrypt(email.subject) : '',
                bodyPreview: email.bodyPreview,
                emailType: email.emailType,
                status: email.status,
                sentAt: email.sentAt,
                sentBy: email.sentBy,
                template: email.template
            }));

            res.status(200).json({
                success: true,
                data: decryptedEmails,
                meta: {
                    total,
                    page: query.page,
                    limit: query.limit,
                    totalPages: Math.ceil(total / query.limit)
                }
            });
        } catch (error: any) {
            console.error('Error fetching sent emails:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sent emails',
                error: error.message
            });
        }
    }

    /**
     * Get specific sent email
     * GET /api/v1/email-notification/sent/:sentEmailId
     */
    async getSentEmailById(req: Request, res: Response) {
        try {
            const { sentEmailId } = req.params;

            const email = await this.sentEmailLogRepository.findOne({
                where: { sentEmailId },
                relations: ['sentBy', 'template', 'lead', 'opportunity']
            });

            if (!email) {
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            // Decrypt sensitive fields
            const decrypted = {
                ...email,
                recipient: email.recipient ? decrypt(email.recipient) : '',
                subject: email.subject ? decrypt(email.subject) : '',
                bodyHtml: email.bodyHtml ? decrypt(email.bodyHtml) : '',
                fromMailbox: email.fromMailbox ? decrypt(email.fromMailbox) : ''
            };

            res.status(200).json({
                success: true,
                data: decrypted
            });
        } catch (error: any) {
            console.error('Error fetching email:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch email',
                error: error.message
            });
        }
    }

    /**
     * Get all templates
     * GET /api/v1/email-notification/templates
     */
    async getTemplates(req: Request, res: Response) {
        try {
            const query = templateListQuerySchema.parse(req.query);
            const organizationId = (req as any).user.organization?.organisationId;

            console.log('🔍 GET Templates - organizationId:', organizationId);
            console.log('🔍 GET Templates - query filters:', query);

            const { templates, total } = await this.templateService.getTemplates({
                ...query,
                organizationId
            });

            console.log('🔍 GET Templates - Result count:', total);

            res.status(200).json({
                success: true,
                data: templates,
                meta: {
                    total,
                    page: query.page,
                    limit: query.limit,
                    totalPages: Math.ceil(total / query.limit)
                }
            });
        } catch (error: any) {
            console.error('Error fetching templates:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch templates',
                error: error.message
            });
        }
    }

    /**
     * Get template by ID
     * GET /api/v1/email-notification/templates/:templateId
     */
    async getTemplateById(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            const template = await this.templateService.getTemplates({
                page: 1,
                limit: 1
            });

            res.status(200).json({
                success: true,
                data: template.templates[0] || null
            });
        } catch (error: any) {
            console.error('Error fetching template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch template',
                error: error.message
            });
        }
    }

    /**
     * Create template
     * POST /api/v1/email-notification/templates
     */
    async createTemplate(req: Request, res: Response) {
        try {
            const validatedData = createTemplateSchema.parse(req.body);
            const userId = (req as any).user.userId;
            const organizationId = (req as any).user.organization?.organisationId;

            const template = await this.templateService.createTemplate({
                ...validatedData,
                variables: JSON.stringify(validatedData.variables),
                defaultRecipients: validatedData.defaultRecipients
                    ? JSON.stringify(validatedData.defaultRecipients)
                    : undefined,
                createdById: userId,
                organizationId
            });

            res.status(201).json({
                success: true,
                message: 'Template created successfully',
                data: template
            });
        } catch (error: any) {
            console.error('Error creating template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create template',
                error: error.message
            });
        }
    }

    /**
     * Update template
     * PUT /api/v1/email-notification/templates/:templateId
     */
    async updateTemplate(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            const validatedData = updateTemplateSchema.parse(req.body);

            const updates: any = { ...validatedData };

            if (validatedData.variables) {
                updates.variables = JSON.stringify(validatedData.variables);
            }

            if (validatedData.defaultRecipients) {
                updates.defaultRecipients = JSON.stringify(validatedData.defaultRecipients);
            }

            const template = await this.templateService.updateTemplate(templateId, updates);

            res.status(200).json({
                success: true,
                message: 'Template updated successfully',
                data: template
            });
        } catch (error: any) {
            console.error('Error updating template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update template',
                error: error.message
            });
        }
    }

    /**
     * Delete template
     * DELETE /api/v1/email-notification/templates/:templateId
     */
    async deleteTemplate(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            await this.templateService.deleteTemplate(templateId);

            res.status(200).json({
                success: true,
                message: 'Template deleted successfully'
            });
        } catch (error: any) {
            console.error('Error deleting template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete template',
                error: error.message
            });
        }
    }

    /**
     * Preview template
     * POST /api/v1/email-notification/templates/:templateId/preview
     */
    async previewTemplate(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            const validatedData = templatePreviewSchema.parse(req.body);

            const { templates } = await this.templateService.getTemplates({ page: 1, limit: 1 });
            const template = templates[0];

            if (!template) {
                return res.status(404).json({
                    success: false,
                    message: 'Template not found'
                });
            }

            let variables = validatedData.variables || {};

            if (validatedData.entityId && template.entityType !== 'GENERAL') {
                variables = await this.templateService.getTemplateVariablesForEntity(
                    template.entityType,
                    validatedData.entityId
                );
            }

            const rendered = this.templateService.renderTemplate(template, variables);

            res.status(200).json({
                success: true,
                data: rendered
            });
        } catch (error: any) {
            console.error('Error previewing template:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to preview template',
                error: error.message
            });
        }
    }
}
