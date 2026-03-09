import { AppDataSource } from "../data-source";
import { ActivityPlanTemplate } from "../entity/ActivityPlanTemplate";
import { ActivityPlanTemplateAction } from "../entity/ActivityPlanTemplateAction";
import { IsNull, Not } from "typeorm";
import { ActivityPlanActionType, encryption } from "../common/utils";

export class ActivityPlanTemplateService {
    private templateRepository = AppDataSource.getRepository(ActivityPlanTemplate);
    private templateActionRepository = AppDataSource.getRepository(ActivityPlanTemplateAction);

    async createTemplate(payload: any, user: any) {
        const { name, description, actions, organizationId, category, segment } = payload;
        const orgId = organizationId || user.organizationId;

        // Check for duplicate category and segment
        await this.checkDuplicate(category, segment, orgId);

        const template = this.templateRepository.create({
            name,
            description,
            category,
            segment,
            isActive: true,
            isDefault: payload.isDefault || false,
            organization: { organisationId: organizationId || user.organizationId } as any,
            modifiedBy: user.userId
        });

        const savedTemplate = await this.templateRepository.save(template);

        if (payload.isDefault) {
            await this.handleSingleDefault(savedTemplate.templateId, orgId);
        }

        if (actions && actions.length > 0) {
            const actionsToSave = actions.map((action: any) => this.templateActionRepository.create({
                template: savedTemplate,
                sequence: action.sequence,
                stageName: action.stageName,
                actionName: action.actionName,
                description: action.description,
                tatDays: action.tatDays || 0,
                tatHours: action.tatHours || 0,
                actionType: action.actionType || ActivityPlanActionType.DEFAULT,
                actionConfig: action.actionConfig,
                modifiedBy: user.userId
            }));
            await this.templateActionRepository.save(actionsToSave);
        }

        return await this.getTemplateById(savedTemplate.templateId);
    }

    async getAllTemplates(organizationId: string) {
        return await this.templateRepository.find({
            where: [
                { organization: { organisationId: organizationId } as any },
                { organization: IsNull() }
            ],
            relations: ["actions"],
            order: { name: "ASC" }
        });
    }

    async getTemplateById(templateId: string) {
        return await this.templateRepository.findOne({
            where: { templateId },
            relations: ["actions"],
            order: {
                actions: {
                    sequence: "ASC"
                }
            }
        });
    }

    async updateTemplate(templateId: string, payload: any, user: any) {
        const template = await this.templateRepository.findOne({ where: { templateId }, relations: ["actions"] });
        if (!template) throw new Error("Template not found");

        if (payload.name) template.name = payload.name;
        if (payload.description) template.description = payload.description;
        if (payload.category !== undefined) template.category = payload.category;
        if (payload.segment !== undefined) template.segment = payload.segment;
        if (payload.isActive !== undefined) template.isActive = payload.isActive;
        if (payload.isDefault !== undefined) template.isDefault = payload.isDefault;
        template.modifiedBy = user.userId;

        // Check for duplicate category and segment if they are being updated
        if (payload.category !== undefined || payload.segment !== undefined) {
            const catToCheck = payload.category !== undefined ? payload.category : template.category;
            const segToCheck = payload.segment !== undefined ? payload.segment : template.segment;
            await this.checkDuplicate(catToCheck, segToCheck, user.organizationId, templateId);
        }

        await this.templateRepository.save(template);

        if (payload.isDefault) {
            await this.handleSingleDefault(templateId, user.organizationId);
        }

        if (payload.actions) {
            await this.templateActionRepository.delete({ template: { templateId } as any });

            const actionsToSave = payload.actions.map((action: any) => this.templateActionRepository.create({
                template: template,
                sequence: action.sequence,
                stageName: action.stageName,
                actionName: action.actionName,
                description: action.description,
                tatDays: action.tatDays || 0,
                tatHours: action.tatHours || 0,
                actionType: action.actionType || ActivityPlanActionType.DEFAULT,
                actionConfig: action.actionConfig,
                modifiedBy: user.userId
            }));
            await this.templateActionRepository.save(actionsToSave);
        }

        return await this.getTemplateById(templateId);
    }

    async deleteTemplate(templateId: string, _user: any) {
        const template = await this.templateRepository.findOne({ where: { templateId } });
        if (!template) throw new Error("Template not found");

        return await this.templateRepository.softRemove(template);
    }

    async cloneActions(targetTemplateId: string, sourceTemplateId: string, user: any) {
        const [targetTemplate, sourceTemplate] = await Promise.all([
            this.getTemplateById(targetTemplateId),
            this.getTemplateById(sourceTemplateId)
        ]);

        if (!targetTemplate) throw new Error("Target template not found");
        if (!sourceTemplate) throw new Error("Source template not found");

        const targetActions = targetTemplate.actions || [];
        const sourceActions = sourceTemplate.actions || [];

        const existingActionKeys = new Set(
            targetActions.map(a => `${a.stageName.toLowerCase()}|${a.actionName.toLowerCase()}`)
        );

        const newActionsToClone = sourceActions.filter(sa => {
            const key = `${sa.stageName.toLowerCase()}|${sa.actionName.toLowerCase()}`;
            return !existingActionKeys.has(key);
        });

        if (newActionsToClone.length === 0) {
            return targetTemplate;
        }

        const maxSequence = targetActions.reduce((max, a) => Math.max(max, a.sequence), 0);

        const actionsToSave = newActionsToClone.map((action, index) => this.templateActionRepository.create({
            template: targetTemplate,
            sequence: maxSequence + index + 1,
            stageName: action.stageName,
            actionName: action.actionName,
            description: action.description,
            tatDays: action.tatDays || 0,
            tatHours: action.tatHours || 0,
            actionType: action.actionType || ActivityPlanActionType.DEFAULT,
            actionConfig: action.actionConfig,
            modifiedBy: user.userId
        }));

        await this.templateActionRepository.save(actionsToSave);

        return await this.getTemplateById(targetTemplateId);
    }

    private async checkDuplicate(category: string, segment: string, orgId: string, excludeTemplateId?: string) {
        const where: any = {
            organization: { organisationId: orgId } as any
        };

        if (category) {
            where.category = encryption(category);
        } else {
            where.category = IsNull();
        }

        if (segment) {
            where.segment = encryption(segment);
        } else {
            where.segment = IsNull();
        }

        if (excludeTemplateId) {
            where.templateId = Not(excludeTemplateId);
        }

        const existing = await this.templateRepository.findOne({ where });
        if (existing) {
            const catStr = category || "General";
            const segStr = segment || "General";
            throw new Error(`An activity plan template already exists for category "${catStr}" and segment "${segStr}".`);
        }
    }
    async setDefaultTemplate(templateId: string, user: any) {
        const template = await this.templateRepository.findOne({ where: { templateId } });
        if (!template) throw new Error("Template not found");

        template.isDefault = true;
        template.modifiedBy = user.userId;
        await this.templateRepository.save(template);

        await this.handleSingleDefault(templateId, user.organizationId);

        return await this.getTemplateById(templateId);
    }

    async getDefaultTemplate(organizationId?: string) {
        // Try to find org-specific default first
        if (organizationId) {
            const orgDefault = await this.templateRepository.findOne({
                where: {
                    isDefault: true,
                    organization: { organisationId: organizationId } as any
                },
                relations: ["actions"],
                order: { actions: { sequence: "ASC" } } as any
            });
            if (orgDefault) return orgDefault;
        }

        // Fallback to global default
        return await this.templateRepository.findOne({
            where: {
                isDefault: true,
                organization: IsNull()
            },
            relations: ["actions"],
            order: { actions: { sequence: "ASC" } } as any
        });
    }

    private async handleSingleDefault(templateId: string, organizationId: string) {
        // Unset any previous default for this organization
        await this.templateRepository.update(
            {
                templateId: Not(templateId),
                organization: { organisationId: organizationId } as any,
                isDefault: true
            },
            { isDefault: false }
        );
    }
}
