import { Request, Response } from "express";
import { ActivityPlanService } from "../services/activityPlan.service";
import { buildResponse } from "../common/utils";

const activityPlanService = new ActivityPlanService();

export class ActivityPlanController {
    async createDefaultPlan(req: Request, res: Response) {
        try {
            const { opportunityId } = req.body;
            // @ts-ignore
            const user = req.user;
            const plan = await activityPlanService.createDefaultPlanForOpportunity(opportunityId, user);
            res.status(201).send(buildResponse(plan, "Activity Plan created successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to create plan", error.message));
        }
    }

    async getPlansByOpportunity(req: Request, res: Response) {
        try {
            const { opportunityId } = req.params;
            const plans = await activityPlanService.getPlansByOpportunity(opportunityId);
            res.status(200).send(buildResponse(plans, "Activity Plans fetched successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to fetch plans", error.message));
        }
    }

    async updateActionStatus(req: Request, res: Response) {
        try {
            const { actionId } = req.params;
            const { status, remarks, comments } = req.body;
            // @ts-ignore
            const user = req.user;
            const action = await activityPlanService.updateActionStatus(actionId, status, remarks, user, comments);
            res.status(200).send(buildResponse(action, "Action status updated successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to update action", error.message));
        }
    }

    async applyTemplate(req: Request, res: Response) {
        try {
            const { opportunityId, templateId } = req.body;
            // @ts-ignore
            const user = req.user;
            const plan = await activityPlanService.applyTemplate(opportunityId, templateId, user);
            res.status(201).send(buildResponse(plan, "Activity Plan applied from template successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to apply template", error.message));
        }
    }

    async createAction(req: Request, res: Response) {
        try {
            const { planId } = req.params;
            const actionData = req.body;
            // @ts-ignore
            const user = req.user;
            const action = await activityPlanService.createAction(planId, actionData, user);
            res.status(201).send(buildResponse(action, "Action created successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to create action", error.message));
        }
    }

    async updateAction(req: Request, res: Response) {
        try {
            const { actionId } = req.params;
            const actionData = req.body;
            // @ts-ignore
            const user = req.user;
            const action = await activityPlanService.updateAction(actionId, actionData, user);
            res.status(200).send(buildResponse(action, "Action updated successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to update action", error.message));
        }
    }

    async deleteAction(req: Request, res: Response) {
        try {
            const { actionId } = req.params;
            await activityPlanService.deleteAction(actionId);
            res.status(200).send(buildResponse(null, "Action deleted successfully"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to delete action", error.message));
        }
    }

    async uploadActivityPlanDocument(req: Request, res: Response) {
        try {
            const { actionId } = req.params;
            const { opportunityId } = req.body;
            // @ts-ignore
            const user = req.user;
            const file = req.file;

            if (!file) {
                return res.status(400).send(buildResponse(null, "No file uploaded"));
            }

            if (!user || !user.userId) {
                return res.status(401).send(buildResponse(null, "User not authenticated"));
            }

            if (!opportunityId) {
                return res.status(400).send(buildResponse(null, "Opportunity ID is required"));
            }

            // Use SharePoint service to upload the document
            const { SharePointService } = await import("../services/sharepoint.service");
            const sharepointService = new SharePointService();

            const document = await sharepointService.uploadActivityPlanDocument(
                user.userId,
                opportunityId,
                actionId,
                file,
                { description: req.body.description }
            );

            res.status(201).send(buildResponse(document, "Document uploaded successfully to activity plan action"));
        } catch (error) {
            res.status(500).send(buildResponse(null, "Failed to upload document", error.message));
        }
    }
}
