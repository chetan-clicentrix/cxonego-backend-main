import { Request, Response } from "express";
import { ActivityPlanTemplateService } from "../services/activityPlanTemplate.service";
import { buildResponse } from "../common/utils";

const templateService = new ActivityPlanTemplateService();

export class ActivityPlanTemplateController {
    async createTemplate(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const template = await templateService.createTemplate(req.body, user);
            res.status(201).send(buildResponse(template, "Template created successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to create template", error.message));
        }
    }

    async getAllTemplates(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const templates = await templateService.getAllTemplates(user.organizationId);
            res.status(200).send(buildResponse(templates, "Templates fetched successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to fetch templates", error.message));
        }
    }

    async getTemplateById(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            const template = await templateService.getTemplateById(templateId);
            res.status(200).send(buildResponse(template, "Template fetched successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to fetch template", error.message));
        }
    }

    async updateTemplate(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            // @ts-ignore
            const user = req.user;
            const template = await templateService.updateTemplate(templateId, req.body, user);
            res.status(200).send(buildResponse(template, "Template updated successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to update template", error.message));
        }
    }

    async deleteTemplate(req: Request, res: Response) {
        try {
            const { templateId } = req.params;
            // @ts-ignore
            const user = req.user;
            await templateService.deleteTemplate(templateId, user);
            res.status(200).send(buildResponse(null, "Template deleted successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to delete template", error.message));
        }
    }
}
