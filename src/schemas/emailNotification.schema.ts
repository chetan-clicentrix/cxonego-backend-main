import { z } from 'zod';
import { EmailType } from '../entity/SentEmailLog';
import { TemplateEntityType, TemplateRecipientType } from '../entity/EmailTemplate';

/**
 * Schema for sending direct email
 */
export const sendEmailSchema = z.object({
    fromMailbox: z.string().email().optional(),
    to: z.union([z.string().email(), z.array(z.string().email())]),
    cc: z.array(z.string().email()).optional(),
    subject: z.string().min(1).max(500),
    bodyHtml: z.string().min(1),
    bodyText: z.string().optional()
});

/**
 * Schema for sending template-based email
 */
export const sendTemplateEmailSchema = z.object({
    templateCode: z.string().min(1),
    entityType: z.enum(['LEAD', 'OPPORTUNITY', 'CONTACT', 'DOCUMENT_LINK']),
    entityId: z.string().min(1),
    recipientOverride: z.array(z.string().email()).optional(),
    fromMailbox: z.string().email().optional()
});

/**
 * Schema for sending document link email
 */
export const sendDocumentLinkSchema = z.object({
    uploadSessionId: z.string().min(1),
    customerEmail: z.string().email(),
    fromMailbox: z.string().email().optional()
});

/**
 * Schema for creating email template
 */
export const createTemplateSchema = z.object({
    templateName: z.string().min(1).max(255),
    templateCode: z.string().min(1).max(100),
    entityType: z.nativeEnum(TemplateEntityType),
    recipientType: z.nativeEnum(TemplateRecipientType),
    subject: z.string().min(1).max(500),
    bodyHtml: z.string().min(1),
    bodyText: z.string().optional(),
    variables: z.array(z.string()),
    defaultRecipients: z.array(z.string().email()).optional(),
    isActive: z.boolean().optional().default(true),
    isDefault: z.boolean().optional().default(false)
});

/**
 * Schema for updating email template
 */
export const updateTemplateSchema = z.object({
    templateName: z.string().min(1).max(255).optional(),
    subject: z.string().min(1).max(500).optional(),
    bodyHtml: z.string().min(1).optional(),
    bodyText: z.string().optional(),
    variables: z.array(z.string()).optional(),
    defaultRecipients: z.array(z.string().email()).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional()
});

/**
 * Schema for template preview
 */
export const templatePreviewSchema = z.object({
    entityId: z.string().optional(),
    variables: z.record(z.any()).optional()
});

/**
 * Schema for sent email history query
 */
export const sentEmailHistoryQuerySchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    emailType: z.nativeEnum(EmailType).optional(),
    leadId: z.string().optional(),
    opportunityId: z.string().optional(),
    contactId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
});

/**
 * Schema for template list query
 */
export const templateListQuerySchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    entityType: z.nativeEnum(TemplateEntityType).optional(),
    recipientType: z.nativeEnum(TemplateRecipientType).optional(),
    isActive: z.string().optional().transform(val => val === 'true')
});
