import { AppDataSource } from "../data-source";
import { EntityManager } from "typeorm";
import { ActivityPlan } from "../entity/ActivityPlan";
import { ActivityPlanAction } from "../entity/ActivityPlanAction";
import { Oppurtunity } from "../entity/Oppurtunity";
import { ActivityPlanStatus, ActivityPlanActionStatus, stage } from "../common/utils";
import * as dayjs from "dayjs";
import { User } from "../entity/User";
import { ActivityPlanTemplate } from "../entity/ActivityPlanTemplate";
import { Account } from "../entity/Account";
import { sendMulticastNotifications } from "./pushNotification.service";
import { encryption, decrypt } from "../common/utils";

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
        const planWithActions = await this.planRepository.findOne({
            where: { planId: savedPlan.planId },
            relations: ["actions", "actions.assignedTo"]
        });

        if (planWithActions && planWithActions.actions) {
            planWithActions.actions.sort((a, b) => a.sequence - b.sequence);
        }

        // Trigger overdue check immediately
        await this.checkAndNotifyOverdueActions(savedPlan.planId);

        return planWithActions;
    }

    async getPlansByOpportunity(opportunityId: string) {
        const plans = await this.planRepository.find({
            where: { opportunity: { opportunityId } } as any,
            relations: ["actions", "actions.assignedTo"],
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

        // Check for overdue actions and send notifications
        for (const plan of plans) {
            await this.checkAndNotifyOverdueActions(plan.planId);
        }

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
        const planWithActions = await this.planRepository.findOne({
            where: { planId: savedPlan.planId },
            relations: ["actions", "actions.assignedTo"]
        });

        if (planWithActions && planWithActions.actions) {
            planWithActions.actions.sort((a, b) => a.sequence - b.sequence);
        }

        // Trigger overdue check immediately
        await this.checkAndNotifyOverdueActions(savedPlan.planId);

        return planWithActions;
    }

    async autoAssignPlanToOpportunity(opportunity: Oppurtunity, user: any, transactionEntityManager?: EntityManager) {
        try {
            console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] \ud83d\udd0d Starting auto-assignment for opportunity:', opportunity.opportunityId);

            const accountRepo = transactionEntityManager ? transactionEntityManager.getRepository(Account) : AppDataSource.getRepository(Account);
            const templateRepo = transactionEntityManager ? transactionEntityManager.getRepository(ActivityPlanTemplate) : AppDataSource.getRepository(ActivityPlanTemplate);

            // Fetch Account to get Category and Segment
            const account = await accountRepo.findOne({
                where: { accountId: (opportunity.company as any)?.accountId || (opportunity.company as any) }
            });

            if (!account) {
                console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] \u26a0\ufe0f No account found for opportunity');
                return;
            }

            if (!account.clientCategory || !account.segment) {
                console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] \u26a0\ufe0f Account missing clientCategory or segment:', {
                    accountId: account.accountId,
                    hasCategory: !!account.clientCategory,
                    hasSegment: !!account.segment
                });
                return;
            }

            const searchCategory = encryption(account.clientCategory);
            const searchSegment = encryption(account.segment);

            console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] \u2713 Account found:', {
                accountId: account.accountId,
                clientCategory: account.clientCategory,
                segment: account.segment
            });
            console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] \ud83d\udd12 Searching for templates with:', {
                category: searchCategory,
                segment: searchSegment
            });

            // Search for matching templates (both org-specific and global)
            const templates = await templateRepo.find({
                where: [
                    // Org-specific templates
                    {
                        category: searchCategory,
                        segment: searchSegment,
                        isActive: true,
                        organization: { organisationId: opportunity.organization?.organisationId } as any
                    },
                    // Global templates (organization is null)
                    {
                        category: searchCategory,
                        segment: searchSegment,
                        isActive: true,
                        organization: null as any
                    }
                ]
            });

            console.log(`[ACTIVITY_PLAN_AUTO_ASSIGN] \u2713 Found ${templates.length} matching template(s)`);

            if (templates.length === 0) {
                console.log('[ACTIVITY_PLAN_AUTO_ASSIGN] \u26a0\ufe0f No matching templates found for:', {
                    category: account.clientCategory,
                    segment: account.segment,
                    organizationId: opportunity.organization?.organisationId
                });
            }

            for (const template of templates) {
                console.log(`[ACTIVITY_PLAN_AUTO_ASSIGN] \ud83d\udccb Applying template: ${template.name} (${template.templateId})`);
                await this.applyTemplate(opportunity.opportunityId, template.templateId, user);
                console.log(`[ACTIVITY_PLAN_AUTO_ASSIGN] \u2705 Template applied successfully`);
            }
        } catch (error) {
            console.error('[ACTIVITY_PLAN_AUTO_ASSIGN] \u274c Error in autoAssignPlanToOpportunity:', error);
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
                    console.error('[ACTIVITY_PLAN] \u274c Could not find opportunity ID for plan:', planWithActions.planId);
                }

                console.log(`[ACTIVITY_PLAN] \ud83c\udfaf Action "${status}" status received for stage: ${decryptedStageName}`);

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
                    console.log(`[ACTIVITY_PLAN] \ud83d\ude80 Updating opportunity "${oppId}" stage to "${targetCRMStage}" based on next activity: "${nextPendingAction?.actionName || 'Finalized'}"`);
                    try {
                        const updateRes = await this.opportunityRepository.update(oppId, {
                            stage: targetCRMStage as any
                        });
                        console.log(`[ACTIVITY_PLAN] \u2705 Stage update result:`, updateRes);
                    } catch (err) {
                        console.error(`[ACTIVITY_PLAN] \u274c Failed to update opportunity stage:`, err);
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

                            console.log(`[ACTIVITY_PLAN] \ud83d\udd14 Sending reminder for next action to user: ${owner.userId}`);
                            await sendMulticastNotifications(tokens, title, dueStr, body);
                        }
                    }
                }
            }
        }

        // Check for overdue actions in this plan after status update
        if (action.plan) {
            await this.checkAndNotifyOverdueActions(action.plan.planId);
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

        const savedAction = await this.actionRepository.save(action);
        return await this.actionRepository.findOne({ where: { actionId: savedAction.actionId } });
    }

    async updateAction(actionId: string, actionData: any, user: any) {
        const action = await this.actionRepository.findOne({ where: { actionId } });
        if (!action) throw new Error("Action not found");

        Object.assign(action, actionData);
        action.updatedAt = new Date();
        action.modifiedBy = user.userId;

        await this.actionRepository.save(action);
        return await this.actionRepository.findOne({ where: { actionId } });
    }

    async deleteAction(actionId: string) {
        const action = await this.actionRepository.findOne({ where: { actionId } });
        if (!action) throw new Error("Action not found");

        return await this.actionRepository.remove(action);
    }

    // Helper method to check and notify overdue actions for a specific plan
    async checkAndNotifyOverdueActions(planId: string) {
        try {
            const { notificationService } = await import("./notification.service");
            const { ActivityPlanActionStatus } = await import("../common/utils");

            const plan = await this.planRepository.findOne({
                where: { planId },
                relations: ["actions", "actions.assignedTo", "opportunity", "opportunity.owner"]
            });

            if (!plan || !plan.actions) return;

            const currentDate = new Date();

            for (const action of plan.actions) {
                // Check if action is overdue
                if (
                    (action.status === ActivityPlanActionStatus.PENDING ||
                        action.status === ActivityPlanActionStatus.IN_PROGRESS) &&
                    action.dueDate &&
                    new Date(action.dueDate) < currentDate
                ) {
                    // Determine recipient
                    const recipientUserId = action.assignedTo?.userId ||
                        (plan.opportunity as any)?.owner?.userId ||
                        (plan.opportunity as any)?.ownerId;

                    if (!recipientUserId) continue;

                    // Check if we already sent a notification today
                    const { Notification } = await import("../entity/Notification");
                    const notificationRepository = AppDataSource.getRepository(Notification);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const existingNotification = await notificationRepository
                        .createQueryBuilder("notification")
                        .where("notification.userId = :userId", { userId: recipientUserId })
                        .andWhere("notification.entityId = :entityId", { entityId: action.actionId })
                        .andWhere("notification.type = :type", { type: "activity" })
                        .andWhere("notification.createdAt >= :today", { today })
                        .getOne();

                    if (existingNotification) continue;

                    // Calculate how overdue
                    const daysOverdue = Math.floor(
                        (currentDate.getTime() - new Date(action.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    const overdueText = daysOverdue === 0
                        ? "today"
                        : daysOverdue === 1
                            ? "1 day ago"
                            : `${daysOverdue} days ago`;

                    // Get opportunity title
                    let opportunityTitle = "Unknown Opportunity";
                    if (plan.opportunity) {
                        opportunityTitle = decrypt(plan.opportunity.title);
                    }

                    // Create notification
                    await notificationService.createNotification({
                        userId: recipientUserId,
                        title: `Overdue: ${action.actionName}`,
                        message: `Activity "${action.actionName}" for ${opportunityTitle} was due ${overdueText}. Please complete this action.`,
                        type: "activity",
                        entityId: action.actionId,
                        entityType: "activity_plan_action",
                        actionUrl: `/opportunity/${(plan.opportunity as any)?.opportunityId}`,
                        icon: "clock-circle",
                    });

                    console.log(`[OVERDUE_NOTIFICATION] ✅ Sent for action: ${action.actionName}`);
                }
            }
        } catch (error) {
            console.error('[OVERDUE_NOTIFICATION] \u274c Error checking overdue actions:', error);
        }
    }

    // Method to check all overdue actions for a specific user across all plans
    async checkAllOverdueActionsForUser(userId: string) {
        try {
            const { notificationService } = await import("./notification.service");
            const { ActivityPlanActionStatus } = await import("../common/utils");
            const { ActivityPlanAction } = await import("../entity/ActivityPlanAction");

            const currentDate = new Date();

            // Find overdue actions for this user
            const overdueActions = await this.actionRepository
                .createQueryBuilder("action")
                .leftJoinAndSelect("action.plan", "plan")
                .leftJoinAndSelect("plan.opportunity", "opportunity")
                .leftJoinAndSelect("opportunity.owner", "owner")
                .leftJoinAndSelect("action.assignedTo", "assignedTo")
                .where("action.status IN (:...statuses)", {
                    statuses: [ActivityPlanActionStatus.PENDING, ActivityPlanActionStatus.IN_PROGRESS]
                })
                .andWhere("action.dueDate < :currentDate", { currentDate })
                .andWhere(
                    "(assignedTo.userId = :userId OR (assignedTo.userId IS NULL AND (owner.userId = :userId OR opportunity.ownerId = :userId)))",
                    { userId }
                )
                .getMany();

            if (overdueActions.length === 0) return;

            for (const action of overdueActions) {
                // Determine recipient
                const recipientUserId = userId;

                // Check if we already sent a notification today
                const { Notification } = await import("../entity/Notification");
                const notificationRepository = AppDataSource.getRepository(Notification);

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const existingNotification = await notificationRepository
                    .createQueryBuilder("notification")
                    .where("notification.userId = :userId", { userId: recipientUserId })
                    .andWhere("notification.entityId = :entityId", { entityId: action.actionId })
                    .andWhere("notification.type = :type", { type: "activity" })
                    .andWhere("notification.createdAt >= :today", { today })
                    .getOne();

                if (existingNotification) continue;

                // Calculate how overdue
                const daysOverdue = Math.floor(
                    (currentDate.getTime() - new Date(action.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                );

                const overdueText = daysOverdue === 0
                    ? "today"
                    : daysOverdue === 1
                        ? "1 day ago"
                        : `${daysOverdue} days ago`;

                // Get opportunity title
                let opportunityTitle = "Unknown Opportunity";
                if (action.plan?.opportunity) {
                    opportunityTitle = decrypt(action.plan.opportunity.title);
                }

                // Create notification
                await notificationService.createNotification({
                    userId: recipientUserId,
                    title: `Overdue: ${action.actionName}`,
                    message: `Activity "${action.actionName}" for ${opportunityTitle} was due ${overdueText}. Please complete this action.`,
                    type: "activity",
                    entityId: action.actionId,
                    entityType: "activity_plan_action",
                    actionUrl: `/opportunity/${(action.plan?.opportunity as any)?.opportunityId}`,
                    icon: "clock-circle",
                });

                console.log(`[OVERDUE_NOTIFICATION] ✅ User-wide Sent for action: ${action.actionName}`);
            }
        } catch (error) {
            console.error('[OVERDUE_NOTIFICATION] \u274c Error in checkAllOverdueActionsForUser:', error);
        }
    }
}
