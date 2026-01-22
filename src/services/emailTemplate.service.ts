import { AppDataSource } from "../data-source";
import { EmailTemplate, TemplateEntityType, TemplateRecipientType } from "../entity/EmailTemplate";
import { Lead } from "../entity/Lead";
import { Oppurtunity } from "../entity/Oppurtunity";
import { Contact } from "../entity/Contact";
import { UploadSession } from "../entity/UploadSession";
import { decrypt } from "../common/utils";

/**
 * Email Template Service
 * Manages email templates and variable replacement
 */
export class EmailTemplateService {
    private templateRepository = AppDataSource.getRepository(EmailTemplate);
    private leadRepository = AppDataSource.getRepository(Lead);
    private opportunityRepository = AppDataSource.getRepository(Oppurtunity);
    private contactRepository = AppDataSource.getRepository(Contact);
    private uploadSessionRepository = AppDataSource.getRepository(UploadSession);

    /**
     * Get template by code
     */
    async getTemplateByCode(code: string, organizationId?: string): Promise<EmailTemplate | null> {
        const query: any = {
            templateCode: code,
            isActive: true
        };

        if (organizationId) {
            query.organizationId = organizationId;
        }

        return await this.templateRepository.findOne({
            where: query
        });
    }

    /**
     * Get all templates with filters
     */
    async getTemplates(filters: {
        entityType?: TemplateEntityType;
        recipientType?: TemplateRecipientType;
        isActive?: boolean;
        organizationId?: string;
        page?: number;
        limit?: number;
    }): Promise<{ templates: EmailTemplate[]; total: number }> {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const queryBuilder = this.templateRepository.createQueryBuilder('template')
            .leftJoinAndSelect('template.createdBy', 'user');

        if (filters.entityType) {
            queryBuilder.andWhere('template.entityType = :entityType', { entityType: filters.entityType });
        }

        if (filters.recipientType) {
            queryBuilder.andWhere('template.recipientType = :recipientType', { recipientType: filters.recipientType });
        }

        if (filters.isActive !== undefined) {
            queryBuilder.andWhere('template.isActive = :isActive', { isActive: filters.isActive });
        }

        if (filters.organizationId) {
            queryBuilder.andWhere('template.organizationId = :organizationId', { organizationId: filters.organizationId });
        }

        queryBuilder
            .orderBy('template.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [templates, total] = await queryBuilder.getManyAndCount();

        return { templates, total };
    }

    /**
     * Create new template
     */
    async createTemplate(templateData: Partial<EmailTemplate>): Promise<EmailTemplate> {
        const template = new EmailTemplate(templateData);
        return await this.templateRepository.save(template);
    }

    /**
     * Update template
     */
    async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
        await this.templateRepository.update({ templateId }, updates);
        const updated = await this.templateRepository.findOne({ where: { templateId } });
        if (!updated) {
            throw new Error('Template not found after update');
        }
        return updated;
    }

    /**
     * Soft delete template
     */
    async deleteTemplate(templateId: string): Promise<void> {
        const template = await this.templateRepository.findOne({ where: { templateId } });
        if (!template) {
            throw new Error('Template not found');
        }
        await this.templateRepository.softRemove(template);
    }

    /**
     * Render template with variables
     */
    renderTemplate(template: EmailTemplate, variables: Record<string, any>): {
        subject: string;
        bodyHtml: string;
        bodyText?: string;
    } {
        let subject = template.subject;
        let bodyHtml = template.bodyHtml;
        let bodyText = template.bodyText || undefined;

        // Replace all variables in format {{variableName}}
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            const replacement = value !== null && value !== undefined ? String(value) : '';

            subject = subject.replace(regex, replacement);
            bodyHtml = bodyHtml.replace(regex, replacement);
            if (bodyText) {
                bodyText = bodyText.replace(regex, replacement);
            }
        }

        return { subject, bodyHtml, bodyText };
    }

    /**
     * Extract variables from entity
     */
    async getTemplateVariablesForEntity(entityType: string, entityId: string): Promise<Record<string, any>> {
        switch (entityType) {
            case 'LEAD':
                return await this.getLeadVariables(entityId);
            case 'OPPORTUNITY':
                return await this.getOpportunityVariables(entityId);
            case 'CONTACT':
                return await this.getContactVariables(entityId);
            case 'DOCUMENT_LINK':
                return await this.getDocumentLinkVariables(entityId);
            default:
                return {};
        }
    }

    /**
     * Get variables from Lead entity
     */
    private async getLeadVariables(leadId: string): Promise<Record<string, any>> {
        const lead = await this.leadRepository.findOne({
            where: { leadId },
            relations: ['owner', 'company', 'organization']
        });

        if (!lead) {
            throw new Error(`Lead not found: ${leadId}`);
        }

        return {
            leadId: lead.leadId,
            leadName: lead.fullName ? decrypt(lead.fullName) : '',
            leadEmail: lead.email ? decrypt(lead.email) : '',
            leadPhone: lead.phone ? decrypt(lead.phone) : '',
            leadTitle: lead.title ? decrypt(lead.title) : '',
            companyName: lead.company?.accountName ? decrypt(lead.company.accountName) : '',
            leadSource: lead.leadSource ? decrypt(lead.leadSource) : '',
            leadStatus: lead.status || '',
            assignedUserName: lead.owner?.firstName && lead.owner?.lastName
                ? `${decrypt(lead.owner.firstName)} ${decrypt(lead.owner.lastName)}`
                : (lead.owner?.firstName ? decrypt(lead.owner.firstName) : ''),
            assignedUserEmail: lead.owner?.email ? decrypt(lead.owner.email) : '',
            city: lead.city ? decrypt(lead.city) : '',
            state: lead.state ? decrypt(lead.state) : '',
            country: lead.country ? decrypt(lead.country) : ''
        };
    }

    /**
     * Get variables from Opportunity entity
     */
    private async getOpportunityVariables(opportunityId: string): Promise<Record<string, any>> {
        const opportunity = await this.opportunityRepository.findOne({
            where: { opportunityId },
            relations: ['owner', 'account', 'organization']
        });

        if (!opportunity) {
            throw new Error(`Opportunity not found: ${opportunityId}`);
        }

        return {
            opportunityId: opportunity.opportunityId,
            opportunityTitle: opportunity.title ? decrypt(opportunity.title) : '',
            opportunityStage: opportunity.stage || '',
            opportunityValue: opportunity.estimatedRevenue ? decrypt(opportunity.estimatedRevenue) : '',
            opportunityCurrency: opportunity.currency || '',
            accountName: opportunity.company?.accountName ? decrypt(opportunity.company.accountName) : '',
            assignedUserName: opportunity.owner?.firstName && opportunity.owner?.lastName
                ? `${decrypt(opportunity.owner.firstName)} ${decrypt(opportunity.owner.lastName)}`
                : (opportunity.owner?.firstName ? decrypt(opportunity.owner.firstName) : ''),
            assignedUserEmail: opportunity.owner?.email ? decrypt(opportunity.owner.email) : '',
            description: opportunity.description ? decrypt(opportunity.description) : ''
        };
    }

    /**
     * Get variables from Contact entity
     */
    private async getContactVariables(contactId: string): Promise<Record<string, any>> {
        const contact = await this.contactRepository.findOne({
            where: { contactId },
            relations: ['account']
        });

        if (!contact) {
            throw new Error(`Contact not found: ${contactId}`);
        }

        return {
            contactId: contact.contactId,
            contactName: contact.fullName ? decrypt(contact.fullName) : '',
            contactEmail: contact.email ? decrypt(contact.email) : '',
            contactPhone: contact.phone ? decrypt(contact.phone) : '',
            contactDesignation: contact.designation ? decrypt(contact.designation) : '',
            companyName: contact.company?.accountName ? decrypt(contact.company.accountName) : ''
        };
    }

    /**
     * Get variables from Upload Session (for document link emails)
     */
    private async getDocumentLinkVariables(uploadSessionId: string): Promise<Record<string, any>> {
        const uploadSession = await this.uploadSessionRepository.findOne({
            where: { uploadSessionId },
            relations: ['opportunity']
        });

        if (!uploadSession) {
            throw new Error(`Upload session not found: ${uploadSessionId}`);
        }

        // Generate the public upload link
        const baseUrl = process.env.PUBLIC_UPLOAD_BASE_URL || 'http://localhost:5173/upload';
        const uploadLink = `${baseUrl}/${uploadSession.sessionToken}`;

        return {
            uploadSessionId: uploadSession.uploadSessionId,
            uploadLink: uploadLink,
            opportunityTitle: uploadSession.opportunity?.title ? decrypt(uploadSession.opportunity.title) : '',
            expiresAt: uploadSession.expiresAt ? uploadSession.expiresAt.toLocaleDateString() : '',
            uploadsCount: uploadSession.uploads?.length || 0
        };
    }
}
