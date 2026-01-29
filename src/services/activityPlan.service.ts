import { AppDataSource } from "../data-source";
import { ActivityPlan } from "../entity/ActivityPlan";
import { ActivityPlanAction } from "../entity/ActivityPlanAction";
import { Oppurtunity } from "../entity/Oppurtunity";
import { ActivityPlanStatus, ActivityPlanActionStatus, stage } from "../common/utils";
import * as dayjs from "dayjs";
import { User } from "../entity/User";
import { ActivityPlanTemplate } from "../entity/ActivityPlanTemplate";
import { Account } from "../entity/Account";
import { sendMulticastNotifications } from "./pushNotification.service";
import { decrypt } from "../common/utils";

export class ActivityPlanService {
    private planRepository = AppDataSource.getRepository(ActivityPlan);
    private actionRepository = AppDataSource.getRepository(ActivityPlanAction);
    private opportunityRepository = AppDataSource.getRepository(Oppurtunity);

    async createDefaultPlanForOpportunity(opportunityId: string, user: any) {
        const opportunity = await this.opportunityRepository.findOne({ where: { opportunityId } });
        if (!opportunity) throw new Error("Opportunity not found");

        const plan = new ActivityPlan({
            name: "Retail-FTU Lead   Plan",
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
                stageName: "Document collection",
                actionName: "1st Call to Customer",
                description: "First call should be go within 2 hours of lead allocation",
                tatHours: 0,
                tatDays: 0
            },
            {
                sequence: 2,
                stageName: "Document collection",
                actionName: "2nd Call / Site Visit",
                description: "Visit client place. MANDATORY: Upload Google Geotagged Photo.",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 3,
                stageName: "Document collection",
                actionName: "Document Collection",
                description: "Share pending list with client via Mail/WhatsApp.",
                tatHours: 3,
                tatDays: 0
            },
            {
                sequence: 4,
                stageName: "Document collection",
                actionName: "Collect Pending Documents",
                description: "Verify Asset Location and Original Documents",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 5,
                stageName: "Proposal Preparation",
                actionName: "Prepare proposal",
                description: "Create Proposals for banks.",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 6,
                stageName: "Login Desk",
                actionName: "Login Desk",
                description: "Login desk to verify all received documents against checklist.",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 7,
                stageName: "Query",
                actionName: "Query Understanding",
                description: "If there are query Understand those queries.",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 8,
                stageName: "Query Resolution",
                actionName: "Query resolution.",
                description: "Query Resolution with client collect final documents and re-login.",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 9,
                stageName: "Approved",
                actionName: "Get Approval from bank",
                description: "when the loan is approved complete this activity",
                tatHours: 0,
                tatDays: 1
            },
            {
                sequence: 10,
                stageName: "Disbursed",
                actionName: "Get all docuuments and Disbure money",
                description: null,
                tatHours: 0,
                tatDays: 1
            }
        ];

        const savedPlan = await this.planRepository.save(plan);

        let previousDueDate = new Date();

        const actionsToSave = actionsConfig.map(config => {
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
        const planWithActions = await this.planRepository.findOne({ where: { planId: savedPlan.planId }, relations: ["actions"] });
        if (planWithActions && planWithActions.actions) {
            planWithActions.actions.sort((a, b) => a.sequence - b.sequence);
        }
        return planWithActions;
    }

    async getPlansByOpportunity(opportunityId: string) {
        const plans = await this.planRepository.find({
            where: { opportunity: { opportunityId } } as any,
            relations: ["actions"],
            order: {
                createdAt: "DESC"
            }
        });

        // Manually sort actions since TypeORM's order on eager/relations can be flaky
        plans.forEach(plan => {
            if (plan.actions) {
                plan.actions.sort((a, b) => a.sequence - b.sequence);
            }
        });

        return plans;
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
        const planWithActions = await this.planRepository.findOne({ where: { planId: savedPlan.planId }, relations: ["actions"] });
        if (planWithActions && planWithActions.actions) {
            planWithActions.actions.sort((a, b) => a.sequence - b.sequence);
        }
        return planWithActions;
    }

    async autoAssignPlanToOpportunity(opportunity: Oppurtunity, user: any) {
        try {
            console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] 🔍 Starting auto-assignment for opportunity:', opportunity.opportunityId);

            // Fetch Account to get Category and Segment
            const account = await AppDataSource.getRepository(Account).findOne({
                where: { accountId: (opportunity.company as any)?.accountId || (opportunity.company as any) }
            });

            if (!account) {
                console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] ⚠️ No account found for opportunity');
                return;
            }

            if (!account.clientCategory || !account.segment) {
                console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] ⚠️ Account missing clientCategory or segment:', {
                    accountId: account.accountId,
                    hasCategory: !!account.clientCategory,
                    hasSegment: !!account.segment
                });
                return;
            }

            console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] ✓ Account found:', {
                accountId: account.accountId,
                clientCategory: account.clientCategory,
                segment: account.segment
            });

            const templateRepo = AppDataSource.getRepository(ActivityPlanTemplate);

            // Search for matching templates (both org-specific and global)
            // Note: category and segment are now encrypted in both Account and Template
            const templates = await templateRepo.find({
                where: [
                    // Org-specific templates
                    {
                        category: account.clientCategory,
                        segment: account.segment,
                        isActive: true,
                        organization: { organisationId: opportunity.organization?.organisationId } as any
                    },
                    // Global templates (organization is null)
                    {
                        category: account.clientCategory,
                        segment: account.segment,
                        isActive: true,
                        organization: null as any
                    }
                ]
            });

            console.log(`[ACTIVITY_PLAN_AUTO_ASSIGN] ✓ Found ${templates.length} matching template(s)`);

            if (templates.length === 0) {
                console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] ⚠️ No matching templates found for:', {
                    category: account.clientCategory,
                    segment: account.segment,
                    organizationId: opportunity.organization?.organisationId
                });
            }

            for (const template of templates) {
                console.log(`[ACTIVITY_PLAN_AUTO_ASSIGN] 📋 Applying template: ${template.name} (${template.templateId})`);
                await this.applyTemplate(opportunity.opportunityId, template.templateId, user);
                console.log(`[ACTIVITY_PLAN_AUTO_ASSIGN] ✅ Template applied successfully`);
            }
        } catch (error) {
            console.error('[ACTIVITY_PLAN_AUTO_ASSIGN] ❌ Error in autoAssignPlanToOpportunity:', error);
            // Don't throw - we don't want to block opportunity creation if template assignment fails
        }
    }

    async updateActionStatus(actionId: string, status: ActivityPlanActionStatus, remarks: string, user: any, comments?: string) {
        const action = await this.actionRepository.findOne({ where: { actionId }, relations: ["plan"] });
        if (!action) throw new Error("Action not found");

        action.status = status;
        if (status === ActivityPlanActionStatus.COMPLETED) {
            if (!comments || comments.trim() === '') {
                throw new Error("Comment is mandatory for completing an activity");
            }
            action.completedAt = new Date();
            action.comments = comments;
        } else {
            // Logic for "uncomplete" or other status changes
            action.completedAt = null as any;
        }

        if (remarks) action.remarks = remarks;
        action.modifiedBy = user.userId;

        // Capture the decrypted stage name BEFORE save() encrypts it again
        const decryptedStageName = action.stageName;

        await this.actionRepository.save(action);

        // Logic to automatically update Opportunity stage
        if (action.plan) {
            const planWithActions = await this.planRepository.findOne({
                where: { planId: action.plan.planId },
                relations: ["actions", "opportunity"]
            });

            if (planWithActions && planWithActions.actions) {
                // Ensure we have an opportunity ID, check both relation and raw column
                const oppId = planWithActions.opportunity?.opportunityId || (planWithActions as any).opportunityId || (action.plan as any).opportunityId;

                if (!oppId) {
                    console.error('[ACTIVITY_PLAN] ❌ Could not find opportunity ID for plan:', planWithActions.planId);
                }

                console.log(`[ACTIVITY_PLAN] 🎯 Action "${status}" status received for stage: ${decryptedStageName}`);

                // 1. Find the first pending/in-progress task across the WHOLE plan to determine active stage
                const nextPendingAction = planWithActions.actions
                    .filter(a => a.status !== ActivityPlanActionStatus.COMPLETED && a.status !== ActivityPlanActionStatus.SKIPPED)
                    .sort((a, b) => a.sequence - b.sequence)[0];

                const crmStageValues = Object.values(stage);
                let targetCRMStage = null;

                if (nextPendingAction) {
                    // Match the next pending action's stage name with CRM stage
                    targetCRMStage = crmStageValues.find(
                        s => s.toLowerCase().trim() === nextPendingAction.stageName.toLowerCase().trim()
                    );
                } else {
                    // All actions completed! If we're closing the last action, 
                    // ensure we're at least at the stage of the current action.
                    const matchedStage = crmStageValues.find(
                        s => s.toLowerCase().trim() === decryptedStageName.toLowerCase().trim()
                    );
                    targetCRMStage = matchedStage;
                }

                if (targetCRMStage) {
                    console.log(`[ACTIVITY_PLAN] 🚀 Updating opportunity "${oppId}" stage to "${targetCRMStage}" based on next activity: "${nextPendingAction?.actionName || 'Finalized'}"`);
                    try {
                        const updateRes = await this.opportunityRepository.update(oppId, {
                            stage: targetCRMStage as any
                        });
                        console.log(`[ACTIVITY_PLAN] ✅ Stage update result:`, updateRes);
                    } catch (err) {
                        console.error(`[ACTIVITY_PLAN] ❌ Failed to update opportunity stage:`, err);
                    }
                }

                // Reminder for the NEXT action - Only send if we just COMPLETED an action
                if (status === ActivityPlanActionStatus.COMPLETED) {
                    const nextAction = planWithActions.actions
                        .filter(a => a.status === ActivityPlanActionStatus.PENDING || a.status === ActivityPlanActionStatus.IN_PROGRESS)
                        .sort((a, b) => a.sequence - b.sequence)[0];

                    if (nextAction && planWithActions.opportunity.owner) {
                        const owner = await AppDataSource.getRepository(User).findOne({
                            where: { userId: (planWithActions.opportunity.owner as any).userId || (planWithActions.opportunity.owner as any) }
                        });

                        if (owner && (owner.fcmWebToken || owner.fcmAndroidToken)) {
                            const tokens = [owner.fcmWebToken, owner.fcmAndroidToken].filter(t => !!t) as string[];
                            const title = `Next Task: ${nextAction.actionName}`;
                            const dueStr = dayjs(nextAction.dueDate).format('DD MMM, hh:mm A');
                            const body = `Proposal: ${decrypt(planWithActions.opportunity.title)}\nStage: ${nextAction.stageName}\nDue: ${dueStr}`;

                            console.log(`[ACTIVITY_PLAN] 🔔 Sending reminder for next action to user: ${owner.userId}`);
                            await sendMulticastNotifications(tokens, title, dueStr, body);
                        }
                    }
                }
            }
        }

        return await this.actionRepository.findOne({ where: { actionId } });
    }

    async createAction(planId: string, actionData: any, user: any) {
        const plan = await this.planRepository.findOne({ where: { planId } });
        if (!plan) throw new Error("Plan not found");

        const action = new ActivityPlanAction({
            ...actionData,
            plan,
            status: actionData.status || ActivityPlanActionStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
            modifiedBy: user.userId
        } as any);

        return await this.actionRepository.save(action);
    }

    async updateAction(actionId: string, actionData: any, user: any) {
        const action = await this.actionRepository.findOne({ where: { actionId } });
        if (!action) throw new Error("Action not found");

        Object.assign(action, actionData);
        action.updatedAt = new Date();
        action.modifiedBy = user.userId;

        return await this.actionRepository.save(action);
    }

    async deleteAction(actionId: string) {
        const action = await this.actionRepository.findOne({ where: { actionId } });
        if (!action) throw new Error("Action not found");

        return await this.actionRepository.remove(action);
    }
}
