import { AppDataSource } from "../data-source";
import { ActivityPlanTemplate } from "../entity/ActivityPlanTemplate";
import { ActivityPlanTemplateAction } from "../entity/ActivityPlanTemplateAction";
import { IsNull } from "typeorm";

export class ActivityPlanTemplateService {
    private templateRepository = AppDataSource.getRepository(ActivityPlanTemplate);
    private templateActionRepository = AppDataSource.getRepository(ActivityPlanTemplateAction);

    async createTemplate(payload: any, user: any) {
        const { name, description, actions, organizationId, category, segment } = payload;

        const template = this.templateRepository.create({
            name,
            description,
            category,
            segment,
            isActive: true,
            organization: { organisationId: organizationId || user.organizationId } as any,
            modifiedBy: user.userId
        });

        const savedTemplate = await this.templateRepository.save(template);

        if (actions && actions.length > 0) {
            const actionsToSave = actions.map((action: any) => this.templateActionRepository.create({
                template: savedTemplate,
                sequence: action.sequence,
                stageName: action.stageName,
                actionName: action.actionName,
                description: action.description,
                tatDays: action.tatDays || 0,
                tatHours: action.tatHours || 0,
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
        template.modifiedBy = user.userId;

        await this.templateRepository.save(template);

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
}
