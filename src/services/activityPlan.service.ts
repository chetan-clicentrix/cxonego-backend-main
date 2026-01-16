import { AppDataSource } from "../data-source";
import { ActivityPlan } from "../entity/ActivityPlan";
import { ActivityPlanAction } from "../entity/ActivityPlanAction";
import { Oppurtunity } from "../entity/Oppurtunity";
import { ActivityPlanStatus, ActivityPlanActionStatus } from "../common/utils";
import * as dayjs from "dayjs";
import { User } from "../entity/User";
import { ActivityPlanTemplate } from "../entity/ActivityPlanTemplate";
import { Account } from "../entity/Account";

export class ActivityPlanService {
    private planRepository = AppDataSource.getRepository(ActivityPlan);
    private actionRepository = AppDataSource.getRepository(ActivityPlanAction);
    private opportunityRepository = AppDataSource.getRepository(Oppurtunity);

    async createDefaultPlanForOpportunity(opportunityId: string, user: any) {
        const opportunity = await this.opportunityRepository.findOne({ where: { opportunityId } });
        if (!opportunity) throw new Error("Opportunity not found");

        const plan = new ActivityPlan({
            name: "Standard Loan Assessment Plan",
            opportunity: opportunity,
            organization: opportunity.organization,
            status: ActivityPlanStatus.ACTIVE,
            planId: undefined, // Let DB generate
            lead: opportunity.Lead,
            actions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            modifiedBy: user.userId
        } as any);

        const actionsConfig = [
            {
                sequence: 1,
                stageName: "Initial Contact",
                actionName: "1st Call to Customer",
                description: "Understanding requirement & nature of business, taking appointment. TAT: 2 Hrs",
                tatHours: 2,
                tatDays: 0
            },
            {
                sequence: 2,
                stageName: "Initial Contact",
                actionName: "Update Response",
                description: "Update feedback of customer call. TAT: 1 Day",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 3,
                stageName: "Follow Up",
                actionName: "2nd Call / Visit",
                description: "Follow up for document collection & visit to client place. Upload Google Photo. TAT: 1 Day",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 4,
                stageName: "Document Collection",
                actionName: "Share Document Checklist",
                description: "Share pending list with client via Mail/WhatsApp.",
                tatHours: 0,
                tatDays: 0 // Immediate
            },
            {
                sequence: 5,
                stageName: "Document Collection",
                actionName: "Collect Pending Documents",
                description: "Verify Asset Location, Contact person, Original documents.",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 6,
                stageName: "Login Desk",
                actionName: "Verify Documents",
                description: "Login desk verification of all received documents.",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 7,
                stageName: "Analysis",
                actionName: "CAM Preparation",
                description: "Prepare Credit Assessment Memo based on borrower type (FTU, FTB, RC, RB, RA).",
                tatHours: 0,
                tatDays: 2
            }
        ];

        const savedPlan = await this.planRepository.save(plan);

        let previousDueDate = new Date();

        const actionsToSave = actionsConfig.map(config => {
            let dueDate = new Date(previousDueDate);
            if (config.tatHours > 0) dueDate.setHours(dueDate.getHours() + config.tatHours);
            if (config.tatDays > 0) dueDate.setDate(dueDate.getDate() + config.tatDays);

            // Update previousDueDate for the next action to start AFTER this one? 
            // Or does TAT start from plan creation? 
            // Usually sequential: Start of Action 2 = End of Action 1.
            previousDueDate = dueDate;

            return new ActivityPlanAction({
                plan: savedPlan,
                sequence: config.sequence,
                stageName: config.stageName,
                actionName: config.actionName,
                description: config.description,
                tat: config.tatDays > 0 ? `${config.tatDays} Day(s)` : `${config.tatHours} Hour(s)`,
                dueDate: dueDate,
                status: config.sequence === 1 ? ActivityPlanActionStatus.PENDING : ActivityPlanActionStatus.PENDING, // All pending initially
                actionId: undefined,
                assignedTo: null,
                completedAt: null,
                remarks: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                modifiedBy: user.userId
            } as any);
        });

        await this.actionRepository.save(actionsToSave);
        return await this.planRepository.findOne({ where: { planId: savedPlan.planId }, relations: ["actions"] });
    }

    async getPlansByOpportunity(opportunityId: string) {
        return await this.planRepository.find({
            where: { opportunity: { opportunityId } },
            relations: ["actions"],
            order: {
                actions: {
                    sequence: "ASC"
                }
            }
        });
    }

    async applyTemplate(opportunityId: string, templateId: string, user: any) {
        const opportunity = await this.opportunityRepository.findOne({
            where: { opportunityId },
            relations: ["organization", "Lead"]
        });
        if (!opportunity) throw new Error("Opportunity not found");

        const templateRepo = AppDataSource.getRepository(ActivityPlanTemplate);
        const template = await templateRepo.findOne({
            where: { templateId },
            relations: ["actions"]
        });
        if (!template) throw new Error("Template not found");

        const plan = new ActivityPlan({
            name: template.name,
            opportunity: opportunity,
            organization: opportunity.organization,
            status: ActivityPlanStatus.ACTIVE,
            lead: opportunity.Lead,
            actions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            modifiedBy: user.userId
        } as any);

        const savedPlan = await this.planRepository.save(plan);

        let previousDueDate = new Date();

        const actionsToSave = template.actions.sort((a, b) => a.sequence - b.sequence).map(config => {
            let dueDate = new Date(previousDueDate);
            if (config.tatHours > 0) dueDate.setHours(dueDate.getHours() + config.tatHours);
            if (config.tatDays > 0) dueDate.setDate(dueDate.getDate() + config.tatDays);

            previousDueDate = dueDate;

            return new ActivityPlanAction({
                plan: savedPlan,
                sequence: config.sequence,
                stageName: config.stageName,
                actionName: config.actionName,
                description: config.description,
                tat: config.tatDays > 0 ? `${config.tatDays} Day(s)` : `${config.tatHours} Hour(s)`,
                dueDate: dueDate,
                status: ActivityPlanActionStatus.PENDING,
                assignedTo: null,
                completedAt: null,
                remarks: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                modifiedBy: user.userId
            } as any);
        });

        await this.actionRepository.save(actionsToSave);
        return await this.planRepository.findOne({ where: { planId: savedPlan.planId }, relations: ["actions"] });
    }

    async autoAssignPlanToOpportunity(opportunity: Oppurtunity, user: any) {
        // Fetch Account to get Category and Segment
        const account = await AppDataSource.getRepository(Account).findOne({
            where: { accountId: (opportunity.company as any)?.accountId || (opportunity.company as any) }
        });

        if (!account || !account.clientCategory || !account.segment) return;

        const templateRepo = AppDataSource.getRepository(ActivityPlanTemplate);
        const templates = await templateRepo.find({
            where: {
                category: account.clientCategory,
                segment: account.segment,
                isActive: true,
                organization: { organizationId: opportunity.organization?.organisationId } as any
            }
        });

        for (const template of templates) {
            await this.applyTemplate(opportunity.opportunityId, template.templateId, user);
        }
    }

    async updateActionStatus(actionId: string, status: ActivityPlanActionStatus, remarks: string, user: any) {
        const action = await this.actionRepository.findOne({ where: { actionId }, relations: ["plan"] });
        if (!action) throw new Error("Action not found");

        action.status = status;
        if (status === ActivityPlanActionStatus.COMPLETED) {
            action.completedAt = new Date();
        }
        if (remarks) action.remarks = remarks;
        action.modifiedBy = user.userId;

        return await this.actionRepository.save(action);
    }
}
