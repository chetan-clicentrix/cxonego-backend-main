import { AppDataSource } from "../data-source";
import { Lead } from "../entity/Lead";
import { Oppurtunity } from "../entity/Oppurtunity";
import { Account } from "../entity/Account";
import { Contact } from "../entity/Contact";
import { Activity } from "../entity/Activity";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { In, Like, Between } from "typeorm";
import { decrypt, statusType } from "../common/utils";

export interface ContextOptions {
    orgId?: string;
    userId?: string;
}

export class UnifiedService {

    // Helper for partial matching on decrypted data
    private matchesQuery(value: string | undefined, searchQuery: string): boolean {
        if (!value || !searchQuery) return false;
        try {
            const decrypted = decrypt(value);
            return decrypted.toLowerCase().includes(searchQuery.toLowerCase());
        } catch {
            return value.toLowerCase().includes(searchQuery.toLowerCase());
        }
    }

    async smartSearch(params: any, ctx: ContextOptions) {
        const { query, entityTypes = ['all'], filters = {}, limit = 10 } = params;
        const { orgId, userId } = ctx;

        const results: any = {
            leads: [],
            opportunities: [],
            accounts: [],
            contacts: []
        };

        // Search Leads
        if (entityTypes.includes('all') || entityTypes.includes('lead')) {
            const leadRepo = AppDataSource.getRepository(Lead);
            const leadQuery = leadRepo.createQueryBuilder('lead')
                .leftJoinAndSelect('lead.owner', 'owner')
                .leftJoinAndSelect('lead.company', 'company')
                .where('lead.organizationId = :orgId', { orgId });

            if (filters.ownerId === 'mine') leadQuery.andWhere('lead.ownerId = :userId', { userId });
            if (filters.status) leadQuery.andWhere('lead.status = :status', { status: filters.status });
            if (filters.rating) leadQuery.andWhere('lead.rating = :rating', { rating: filters.rating });
            if (filters.city) leadQuery.andWhere('lead.city = :city', { city: filters.city });

            let allLeads = await leadQuery.getMany();
            if (query) {
                allLeads = allLeads.filter(lead =>
                    this.matchesQuery(lead.fullName, query) ||
                    this.matchesQuery(lead.phone, query) ||
                    this.matchesQuery(lead.email, query) ||
                    this.matchesQuery(lead.city, query)
                );
            }
            results.leads = allLeads.slice(0, limit);
        }

        // Search Opportunities
        if (entityTypes.includes('all') || entityTypes.includes('opportunity')) {
            const oppRepo = AppDataSource.getRepository(Oppurtunity);
            const oppQuery = oppRepo.createQueryBuilder('opp')
                .leftJoinAndSelect('opp.owner', 'owner')
                .leftJoinAndSelect('opp.company', 'company')
                .leftJoinAndSelect('opp.contact', 'contact')
                .leftJoinAndSelect('opp.bank', 'bank')
                .where('opp.organizationId = :orgId', { orgId });

            if (filters.ownerId === 'mine') oppQuery.andWhere('opp.ownerId = :userId', { userId });
            if (filters.stage) oppQuery.andWhere('opp.stage = :stage', { stage: filters.stage });
            if (filters.status) oppQuery.andWhere('opp.status = :status', { status: filters.status });

            let allOpps = await oppQuery.getMany();
            if (query) {
                allOpps = allOpps.filter(opp =>
                    this.matchesQuery(opp.title, query) ||
                    (opp.company && this.matchesQuery(opp.company.accountName, query)) ||
                    (opp.contact && (this.matchesQuery(opp.contact.fullName, query) || this.matchesQuery(opp.contact.phone, query)))
                );
            }
            results.opportunities = allOpps.slice(0, limit);
        }

        return results;
    }

    async getDashboard(params: any, ctx: ContextOptions) {
        const { timeRange = 'week' } = params;
        const targetUserId = params.userId || ctx.userId;

        const now = new Date();
        let startDate = new Date();
        switch (timeRange) {
            case 'today': startDate.setHours(0, 0, 0, 0); break;
            case 'week': startDate.setDate(now.getDate() - 7); break;
            case 'month': startDate.setMonth(now.getMonth() - 1); break;
            case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
        }

        const leadRepo = AppDataSource.getRepository(Lead);
        const oppRepo = AppDataSource.getRepository(Oppurtunity);
        const actRepo = AppDataSource.getRepository(Activity);

        const [
            totalLeads, newLeads, qualifiedLeads, hotLeads,
            totalOpportunities, activeOpportunities, wonOpportunities, lostOpportunities,
            upcomingActivities, overdueActivities, completedActivities
        ] = await Promise.all([
            leadRepo.count({ where: { ownerId: targetUserId } as any }),
            leadRepo.count({ where: { ownerId: targetUserId, status: 'NEW', createdAt: Between(startDate, now) } as any }),
            leadRepo.count({ where: { ownerId: targetUserId, status: 'QUALIFIED' } as any }),
            leadRepo.count({ where: { ownerId: targetUserId, rating: 'HOT' } as any }),
            oppRepo.count({ where: { ownerId: targetUserId } as any }),
            oppRepo.count({ where: { ownerId: targetUserId, status: 'ACTIVE' } as any }),
            oppRepo.count({ where: { ownerId: targetUserId, status: 'WON', actualCloseDate: Between(startDate, now) } as any }),
            oppRepo.count({ where: { ownerId: targetUserId, status: 'LOST', actualCloseDate: Between(startDate, now) } as any }),
            actRepo.count({ where: { ownerId: targetUserId, activityStatus: 'OPEN', dueDate: Between(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) } as any }),
            actRepo.count({ where: { ownerId: targetUserId, activityStatus: 'OPEN', dueDate: Between(new Date(0), now) } as any }),
            actRepo.count({ where: { ownerId: targetUserId, activityStatus: 'COMPLETED', actualEndDate: Between(startDate, now) } as any })
        ]);

        const pipelineOpps = await oppRepo.find({ where: { ownerId: targetUserId, status: 'ACTIVE' } as any });
        const pipelineValue = pipelineOpps.reduce((sum, opp) => {
            const revenue = parseInt(decrypt(opp.estimatedRevenue) || '0');
            return sum + (isNaN(revenue) ? 0 : revenue);
        }, 0);

        return {
            timeRange,
            leads: { total: totalLeads, new: newLeads, qualified: qualifiedLeads, hot: hotLeads },
            opportunities: { total: totalOpportunities, active: activeOpportunities, won: wonOpportunities, lost: lostOpportunities, pipelineValue },
            activities: { upcoming: upcomingActivities, overdue: overdueActivities, completed: completedActivities },
            summary: {
                conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : "0.00",
                winRate: (wonOpportunities + lostOpportunities) > 0 ? ((wonOpportunities / (wonOpportunities + lostOpportunities)) * 100).toFixed(2) : "0.00"
            }
        };
    }

    private parseNaturalTime(naturalTime: string): Date {
        const now = new Date();
        const lowerTime = naturalTime.toLowerCase();

        if (lowerTime.includes('tomorrow')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const timeMatch = lowerTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2] || '0');
                const meridiem = timeMatch[3];
                if (meridiem === 'pm' && hours < 12) hours += 12;
                if (meridiem === 'am' && hours === 12) hours = 0;
                tomorrow.setHours(hours, minutes, 0, 0);
            } else {
                tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
            }
            return tomorrow;
        }

        if (lowerTime.includes('today')) {
            const today = new Date(now);
            const timeMatch = lowerTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2] || '0');
                const meridiem = timeMatch[3];
                if (meridiem === 'pm' && hours < 12) hours += 12;
                if (meridiem === 'am' && hours === 12) hours = 0;
                today.setHours(hours, minutes, 0, 0);
            }
            return today;
        }

        if (lowerTime.includes('next week')) {
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(9, 0, 0, 0);
            return nextWeek;
        }

        const inMatch = lowerTime.match(/in (\d+) (hour|day|minute)s?/);
        if (inMatch) {
            const amount = parseInt(inMatch[1]);
            const unit = inMatch[2];
            const future = new Date(now);
            switch (unit) {
                case 'minute': future.setMinutes(future.getMinutes() + amount); break;
                case 'hour': future.setHours(future.getHours() + amount); break;
                case 'day': future.setDate(future.getDate() + amount); break;
            }
            return future;
        }

        const defaultTime = new Date(now);
        defaultTime.setHours(defaultTime.getHours() + 1);
        return defaultTime;
    }

    async scheduleActivity(params: any, ctx: ContextOptions) {
        const { subject, relatedTo, when, activityType = 'CALL', priority = 'NORMAL', description } = params;
        const dueDate = this.parseNaturalTime(when);

        const activity = new Activity({} as Activity);
        activity.subject = subject;
        activity.activityType = activityType as any;
        activity.activityStatus = 'OPEN' as any;
        activity.activityPriority = priority as any;
        activity.dueDate = dueDate;
        activity.description = description;

        if (relatedTo) {
            switch (relatedTo.type) {
                case 'lead':
                    const lead = await AppDataSource.getRepository(Lead).findOne({ where: { leadId: relatedTo.id } });
                    if (lead) activity.lead = lead;
                    break;
                case 'opportunity':
                    const opp = await AppDataSource.getRepository(Oppurtunity).findOne({ where: { opportunityId: relatedTo.id } });
                    if (opp) activity.opportunity = opp;
                    break;
                case 'account':
                    const account = await AppDataSource.getRepository(Account).findOne({ where: { accountId: relatedTo.id } });
                    if (account) activity.company = account;
                    break;
            }
        }

        const owner = await AppDataSource.getRepository(User).findOne({ where: { userId: ctx.userId } });
        const organization = await AppDataSource.getRepository(Organisation).findOne({ where: { organisationId: ctx.orgId! } });

        if (owner) activity.owner = owner;
        if (organization) activity.organization = organization;

        return await AppDataSource.getRepository(Activity).save(activity);
    }

    async getUpcomingActivities(params: any, ctx: ContextOptions) {
        const { days = 7, limit = 20 } = params;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + Number(days));

        return await AppDataSource.getRepository(Activity).createQueryBuilder('activity')
            .leftJoinAndSelect('activity.lead', 'lead')
            .leftJoinAndSelect('activity.opportunity', 'opportunity')
            .where('activity.organizationId = :orgId', { orgId: ctx.orgId })
            .andWhere('activity.ownerId = :userId', { userId: ctx.userId })
            .andWhere('activity.activityStatus = :status', { status: 'OPEN' })
            .andWhere('activity.dueDate BETWEEN :now AND :future', { now, future: futureDate })
            .orderBy('activity.dueDate', 'ASC')
            .limit(Number(limit))
            .getMany();
    }

    async getOverdueActivities(params: any, ctx: ContextOptions) {
        const { limit = 20 } = params;
        const now = new Date();

        return await AppDataSource.getRepository(Activity).createQueryBuilder('activity')
            .leftJoinAndSelect('activity.lead', 'lead')
            .leftJoinAndSelect('activity.opportunity', 'opportunity')
            .where('activity.organizationId = :orgId', { orgId: ctx.orgId })
            .andWhere('activity.ownerId = :userId', { userId: ctx.userId })
            .andWhere('activity.activityStatus = :status', { status: 'OPEN' })
            .andWhere('activity.dueDate < :now', { now })
            .orderBy('activity.dueDate', 'ASC')
            .limit(Number(limit))
            .getMany();
    }
}
