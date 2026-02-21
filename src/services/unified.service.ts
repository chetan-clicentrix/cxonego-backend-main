import { AppDataSource } from "../data-source";
import { Lead } from "../entity/Lead";
import { Oppurtunity } from "../entity/Oppurtunity";
import { Account } from "../entity/Account";
import { Contact } from "../entity/Contact";
import { Activity } from "../entity/Activity";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { Note } from "../entity/Note";
import { Case } from "../entity/Case";
import { Bank } from "../entity/Bank";
import { In, Like, Between } from "typeorm";
import { decrypt, encryption, statusType, stage, opportunityStatus } from "../common/utils";
import { v4 as uuidv4 } from "uuid";

export interface ContextOptions {
    orgId?: string;
    userId?: string;
}

export class UnifiedService {

    // ─── Guard helpers ────────────────────────────────────────────────────────────
    private requireOrg(ctx: ContextOptions) {
        if (!ctx.orgId) throw new Error("Auth context missing: orgId required. Ensure API key is valid.");
    }
    private requireUser(ctx: ContextOptions) {
        if (!ctx.userId) throw new Error("Auth context missing: userId required. Ensure you are logged in.");
    }

    // ─── Decrypt helper: safe decrypt that falls back to raw value ────────────────
    private safe(value: string | undefined): string {
        if (!value) return "";
        try { return decrypt(value); } catch { return value; }
    }

    // ─── Partial match on encrypted/plain field ───────────────────────────────────
    private matchesQuery(value: string | undefined, searchQuery: string): boolean {
        if (!value || !searchQuery) return false;
        try {
            const decrypted = decrypt(value);
            return decrypted.toLowerCase().includes(searchQuery.toLowerCase());
        } catch {
            return value.toLowerCase().includes(searchQuery.toLowerCase());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // EXISTING TOOLS (hardened)
    // ═══════════════════════════════════════════════════════════════════════════════

    async smartSearch(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { query, entityTypes = ['all'], filters = {}, limit = 10 } = params;

        if (!query && Object.keys(filters).length === 0) {
            throw new Error("Provide a search query (name/phone/email) or at least one filter (status, rating, stage, loanType).");
        }

        const { orgId, userId } = ctx;
        const results: any = { leads: [], opportunities: [] };

        // ── Search Leads ──
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
                    this.matchesQuery(lead.city, query) ||
                    this.matchesQuery(lead.loanType, query)
                );
            }

            // Filter by loanType if provided
            if (filters.loanType) {
                allLeads = allLeads.filter(l => this.safe(l.loanType).toLowerCase().includes(filters.loanType.toLowerCase()));
            }

            results.leads = allLeads.slice(0, limit).map(l => ({
                leadId: l.leadId,
                fullName: this.safe(l.fullName),
                phone: this.safe(l.phone),
                email: this.safe(l.email),
                loanType: this.safe(l.loanType),
                loanAmount: this.safe(l.loanAmount),
                zone: this.safe(l.zone),
                taluka: this.safe(l.taluka),
                village: this.safe(l.village),
                status: l.status,
                rating: l.rating,
                leadSource: this.safe(l.leadSource),
                city: this.safe(l.city),
                owner: l.owner ? { userId: l.owner.userId, name: `${l.owner.firstName} ${l.owner.lastName}` } : null
            }));
        }

        // ── Search Opportunities ──
        if (entityTypes.includes('all') || entityTypes.includes('opportunity')) {
            const oppRepo = AppDataSource.getRepository(Oppurtunity);
            const oppQuery = oppRepo.createQueryBuilder('opp')
                .leftJoinAndSelect('opp.owner', 'owner')
                .leftJoinAndSelect('opp.company', 'company')
                .leftJoinAndSelect('opp.contact', 'contact')
                .leftJoinAndSelect('opp.banks', 'banks')
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

            if (filters.loanType) {
                allOpps = allOpps.filter(o => this.safe(o.loanType).toLowerCase().includes(filters.loanType.toLowerCase()));
            }

            results.opportunities = allOpps.slice(0, limit).map(o => ({
                opportunityId: o.opportunityId,
                title: this.safe(o.title),
                stage: o.stage,
                status: o.status,
                loanType: this.safe(o.loanType),
                loanAmount: this.safe(o.loanAmount),
                estimatedRevenue: this.safe(o.estimatedRevenue),
                estimatedCloseDate: o.estimatedCloseDate,
                banks: (o.banks || []).map((b: any) => b.bankName || b.name).filter(Boolean),
                applicantType: o.applicantType,
                owner: o.owner ? { userId: o.owner.userId, name: `${o.owner.firstName} ${o.owner.lastName}` } : null
            }));
        }

        return results;
    }

    async getDashboard(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        if (!ctx.userId && !params.userId) {
            throw new Error("Auth context missing: userId required for dashboard. Provide userId in params for manager view.");
        }

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
            leadRepo.count({ where: { ownerId: targetUserId, status: 'New' as any, createdAt: Between(startDate, now) } as any }),
            leadRepo.count({ where: { ownerId: targetUserId, status: 'Qualified' as any } as any }),
            leadRepo.count({ where: { ownerId: targetUserId, rating: 'Hot' as any } as any }),
            oppRepo.count({ where: { ownerId: targetUserId } as any }),
            oppRepo.count({ where: { ownerId: targetUserId, status: 'Active' as any } as any }),
            oppRepo.count({ where: { ownerId: targetUserId, status: 'Won' as any, actualCloseDate: Between(startDate, now) } as any }),
            oppRepo.count({ where: { ownerId: targetUserId, status: 'Lost' as any, actualCloseDate: Between(startDate, now) } as any }),
            actRepo.count({ where: { ownerId: targetUserId, activityStatus: 'Open' as any, dueDate: Between(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) } as any }),
            actRepo.count({ where: { ownerId: targetUserId, activityStatus: 'Open' as any, dueDate: Between(new Date(0), now) } as any }),
            actRepo.count({ where: { ownerId: targetUserId, activityStatus: 'Completed' as any, actualEndDate: Between(startDate, now) } as any })
        ]);

        const pipelineOpps = await oppRepo.find({ where: { ownerId: targetUserId, status: 'Active' as any } as any });
        const pipelineValue = pipelineOpps.reduce((sum, opp) => {
            const revenue = parseInt(this.safe(opp.estimatedRevenue) || '0');
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

    private parseNaturalTime(naturalTime: string): { date: Date; warning?: string } {
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
            } else { tomorrow.setHours(9, 0, 0, 0); }
            return { date: tomorrow };
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
            return { date: today };
        }

        if (lowerTime.includes('next week')) {
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(9, 0, 0, 0);
            return { date: nextWeek };
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
            return { date: future };
        }

        const defaultTime = new Date(now);
        defaultTime.setHours(defaultTime.getHours() + 1);
        return {
            date: defaultTime,
            warning: `Could not parse "${naturalTime}" — defaulted to 1 hour from now (${defaultTime.toISOString()}). Please verify the scheduled time.`
        };
    }

    async scheduleActivity(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { subject, relatedTo, when, activityType = 'CALL', priority = 'NORMAL', description } = params;

        if (!subject) throw new Error("Activity subject is required.");
        if (!when) throw new Error("Activity time is required (e.g. 'tomorrow 3pm', 'in 2 hours').");

        const parsed = this.parseNaturalTime(when);
        const activity = new Activity({} as Activity);
        activity.activityId = uuidv4();
        activity.subject = subject;
        activity.activityType = activityType as any;
        activity.activityStatus = 'Open' as any;
        activity.activityPriority = priority as any;
        activity.dueDate = parsed.date;
        activity.description = description;

        if (relatedTo?.id) {
            switch (relatedTo.type) {
                case 'lead': {
                    const lead = await AppDataSource.getRepository(Lead).findOne({ where: { leadId: relatedTo.id } });
                    if (lead) activity.lead = lead;
                    else throw new Error(`Lead not found: ${relatedTo.id}`);
                    break;
                }
                case 'opportunity': {
                    const opp = await AppDataSource.getRepository(Oppurtunity).findOne({ where: { opportunityId: relatedTo.id } });
                    if (opp) activity.opportunity = opp;
                    else throw new Error(`Opportunity not found: ${relatedTo.id}`);
                    break;
                }
                case 'account': {
                    const account = await AppDataSource.getRepository(Account).findOne({ where: { accountId: relatedTo.id } });
                    if (account) activity.company = account;
                    break;
                }
            }
        }

        const owner = await AppDataSource.getRepository(User).findOne({ where: { userId: ctx.userId } });
        const organization = await AppDataSource.getRepository(Organisation).findOne({ where: { organisationId: ctx.orgId! } });

        if (owner) activity.owner = owner;
        if (organization) activity.organization = organization;

        const saved = await AppDataSource.getRepository(Activity).save(activity);
        return {
            activityId: saved.activityId,
            subject: saved.subject,
            activityType: saved.activityType,
            dueDate: saved.dueDate,
            priority: saved.activityPriority,
            warning: parsed.warning || null
        };
    }

    async getUpcomingActivities(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { days = 7, limit = 20 } = params;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + Number(days));

        const activities = await AppDataSource.getRepository(Activity).createQueryBuilder('activity')
            .leftJoinAndSelect('activity.lead', 'lead')
            .leftJoinAndSelect('activity.opportunity', 'opportunity')
            .where('activity.organizationId = :orgId', { orgId: ctx.orgId })
            .andWhere('activity.ownerId = :userId', { userId: ctx.userId })
            .andWhere('activity.activityStatus = :status', { status: 'Open' })
            .andWhere('activity.dueDate BETWEEN :now AND :future', { now, future: futureDate })
            .orderBy('activity.dueDate', 'ASC')
            .limit(Number(limit))
            .getMany();

        return activities.map(a => ({
            activityId: a.activityId,
            subject: a.subject,
            activityType: a.activityType,
            dueDate: a.dueDate,
            priority: a.activityPriority,
            relatedLead: a.lead ? { leadId: a.lead.leadId, name: this.safe(a.lead.fullName) } : null,
            relatedOpportunity: a.opportunity ? { opportunityId: a.opportunity.opportunityId, title: this.safe(a.opportunity.title) } : null
        }));
    }

    async getOverdueActivities(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { limit = 20 } = params;
        const now = new Date();

        const activities = await AppDataSource.getRepository(Activity).createQueryBuilder('activity')
            .leftJoinAndSelect('activity.lead', 'lead')
            .leftJoinAndSelect('activity.opportunity', 'opportunity')
            .where('activity.organizationId = :orgId', { orgId: ctx.orgId })
            .andWhere('activity.ownerId = :userId', { userId: ctx.userId })
            .andWhere('activity.activityStatus = :status', { status: 'Open' })
            .andWhere('activity.dueDate < :now', { now })
            .orderBy('activity.dueDate', 'ASC')
            .limit(Number(limit))
            .getMany();

        return activities.map(a => ({
            activityId: a.activityId,
            subject: a.subject,
            activityType: a.activityType,
            dueDate: a.dueDate,
            daysOverdue: Math.floor((now.getTime() - new Date(a.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
            priority: a.activityPriority,
            relatedLead: a.lead ? { leadId: a.lead.leadId, name: this.safe(a.lead.fullName) } : null,
            relatedOpportunity: a.opportunity ? { opportunityId: a.opportunity.opportunityId, title: this.safe(a.opportunity.title) } : null
        }));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // NEW TOOLS
    // ═══════════════════════════════════════════════════════════════════════════════

    async getNotes(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { entityType, entityId, limit = 10 } = params;

        if (!entityType) throw new Error("entityType is required: lead | opportunity | account | contact");
        if (!entityId) throw new Error("entityId (UUID) is required.");

        const noteRepo = AppDataSource.getRepository(Note);
        let query = noteRepo.createQueryBuilder('note')
            .leftJoinAndSelect('note.owner', 'owner');

        switch (entityType) {
            case 'lead': query = query.where('note.leadId = :id', { id: entityId }); break;
            case 'opportunity': query = query.where('note.opportunityId = :id', { id: entityId }); break;
            case 'account': query = query.where('note.accountId = :id', { id: entityId }); break;
            case 'contact': query = query.where('note.contactId = :id', { id: entityId }); break;
            case 'case': query = query.where('note.caseId = :id', { id: entityId }); break;
            default: throw new Error(`Invalid entityType: ${entityType}. Use: lead | opportunity | account | contact | case`);
        }

        const notes = await query
            .orderBy('note.createdAt', 'DESC')
            .limit(Number(limit))
            .getMany();

        if (notes.length === 0) return { message: `No notes found for ${entityType} ${entityId}.`, notes: [] };

        return {
            total: notes.length,
            notes: notes.map(n => ({
                noteId: n.noteId,
                content: this.safe(n.note),
                tags: n.tags ? this.safe(n.tags) : null,
                createdAt: n.createdAt,
                author: n.owner ? `${n.owner.firstName} ${n.owner.lastName}` : 'Unknown'
            }))
        };
    }

    async createNote(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { entityType, entityId, content, tags } = params;

        if (!entityType) throw new Error("entityType is required: lead | opportunity | account | contact | case");
        if (!entityId) throw new Error("entityId (UUID) is required.");
        if (!content || content.trim() === '') throw new Error("Note content cannot be empty.");

        const noteRepo = AppDataSource.getRepository(Note);
        const note = new Note({} as Note);
        note.note = content; // encrypted by BeforeInsert hook

        if (tags) note.tags = tags;

        // Link to entity
        switch (entityType) {
            case 'lead': {
                const lead = await AppDataSource.getRepository(Lead).findOne({ where: { leadId: entityId } });
                if (!lead) throw new Error(`Lead not found: ${entityId}`);
                note.Lead = lead;
                break;
            }
            case 'opportunity': {
                const opp = await AppDataSource.getRepository(Oppurtunity).findOne({ where: { opportunityId: entityId } });
                if (!opp) throw new Error(`Opportunity not found: ${entityId}`);
                note.opportunity = opp;
                break;
            }
            case 'account': {
                const account = await AppDataSource.getRepository(Account).findOne({ where: { accountId: entityId } });
                if (!account) throw new Error(`Account not found: ${entityId}`);
                note.company = account;
                break;
            }
            case 'contact': {
                const contact = await AppDataSource.getRepository(Contact).findOne({ where: { contactId: entityId } });
                if (!contact) throw new Error(`Contact not found: ${entityId}`);
                note.contact = contact;
                break;
            }
            default: throw new Error(`Invalid entityType: ${entityType}`);
        }

        // Set owner and organisation
        const owner = await AppDataSource.getRepository(User).findOne({ where: { userId: ctx.userId } });
        const organization = await AppDataSource.getRepository(Organisation).findOne({ where: { organisationId: ctx.orgId! } });
        if (owner) note.owner = owner;
        if (organization) note.organization = organization;

        const saved = await noteRepo.save(note);
        return {
            noteId: saved.noteId,
            content: content, // return original (not encrypted) for confirmation
            entityType,
            entityId,
            tags: tags || null,
            createdAt: saved.createdAt
        };
    }

    async getPipelineByStage(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { stage: stageFilter, loanType, ownerId, limit = 20 } = params;

        const oppRepo = AppDataSource.getRepository(Oppurtunity);
        const query = oppRepo.createQueryBuilder('opp')
            .leftJoinAndSelect('opp.owner', 'owner')
            .leftJoinAndSelect('opp.banks', 'banks')
            .leftJoinAndSelect('opp.contact', 'contact')
            .where('opp.organizationId = :orgId', { orgId: ctx.orgId })
            .andWhere('opp.status = :status', { status: 'Active' });

        if (stageFilter) query.andWhere('opp.stage = :stage', { stage: stageFilter });
        if (ownerId === 'mine') query.andWhere('opp.ownerId = :userId', { userId: ctx.userId });
        else if (ownerId) query.andWhere('opp.ownerId = :userId', { userId: ownerId });

        query.orderBy('opp.estimatedCloseDate', 'ASC').limit(Number(limit));

        let opps = await query.getMany();

        // Filter by loanType (encrypted field, post-query)
        if (loanType) {
            opps = opps.filter(o => this.safe(o.loanType).toLowerCase().includes(loanType.toLowerCase()));
        }

        const stageCounts: Record<string, number> = {};
        opps.forEach(o => {
            const s = o.stage || 'Unknown';
            stageCounts[s] = (stageCounts[s] || 0) + 1;
        });

        const totalValue = opps.reduce((sum, o) => {
            const v = parseInt(this.safe(o.loanAmount) || this.safe(o.estimatedRevenue) || '0');
            return sum + (isNaN(v) ? 0 : v);
        }, 0);

        return {
            total: opps.length,
            totalPipelineValue: totalValue,
            stageSummary: stageCounts,
            opportunities: opps.map(o => ({
                opportunityId: o.opportunityId,
                title: this.safe(o.title),
                stage: o.stage,
                loanType: this.safe(o.loanType),
                loanAmount: this.safe(o.loanAmount) || this.safe(o.estimatedRevenue),
                estimatedCloseDate: o.estimatedCloseDate,
                applicantType: o.applicantType,
                banks: (o.banks || []).map((b: any) => b.bankName || b.name).filter(Boolean),
                owner: o.owner ? `${o.owner.firstName} ${o.owner.lastName}` : 'Unassigned'
            }))
        };
    }

    async updateOpportunityStage(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { opportunityId, newStage, note } = params;

        if (!opportunityId) throw new Error("opportunityId is required.");
        if (!newStage) throw new Error("newStage is required. Valid stages: Document Collection | Proposal Preparation | Login Desk | Query | Query Resolution | Approved | Disbursed | PDD | Won | Lost");

        const validStages = Object.values(stage);
        if (!validStages.includes(newStage as stage)) {
            throw new Error(`Invalid stage: "${newStage}". Valid stages: ${validStages.join(' | ')}`);
        }

        const oppRepo = AppDataSource.getRepository(Oppurtunity);
        const opp = await oppRepo.findOne({
            where: { opportunityId, organizationId: ctx.orgId } as any,
            relations: ['owner']
        });

        if (!opp) throw new Error(`Opportunity not found or not in your organization: ${opportunityId}`);

        const previousStage = opp.stage;
        (opp as any).stage = newStage;
        await oppRepo.save(opp);

        // Optionally create a note about stage change
        if (note) {
            await this.createNote({
                entityType: 'opportunity',
                entityId: opportunityId,
                content: `Stage changed from ${previousStage} to ${newStage}. ${note}`,
                tags: 'stage-change'
            }, ctx);
        }

        return {
            opportunityId,
            title: this.safe(opp.title),
            previousStage,
            newStage,
            loanType: this.safe(opp.loanType),
            loanAmount: this.safe(opp.loanAmount) || this.safe(opp.estimatedRevenue),
            updatedAt: new Date().toISOString(),
            noteAdded: !!note
        };
    }

    async getBankFiles(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { bankName, stage: stageFilter, limit = 20 } = params;

        if (!bankName) throw new Error("bankName is required (e.g. 'HDFC', 'Axis', 'SBI').");

        const oppRepo = AppDataSource.getRepository(Oppurtunity);
        const query = oppRepo.createQueryBuilder('opp')
            .leftJoinAndSelect('opp.banks', 'banks')
            .leftJoinAndSelect('opp.owner', 'owner')
            .leftJoinAndSelect('opp.contact', 'contact')
            .where('opp.organizationId = :orgId', { orgId: ctx.orgId })
            .andWhere('opp.status = :status', { status: 'Active' });

        if (stageFilter) query.andWhere('opp.stage = :stage', { stage: stageFilter });
        query.limit(Number(limit));

        const allOpps = await query.getMany();

        // Filter by bank name (post-query since bank names aren't in main query WHERE)
        const filtered = allOpps.filter(opp =>
            (opp.banks || []).some((b: any) =>
                (b.bankName || b.name || '').toLowerCase().includes(bankName.toLowerCase())
            )
        );

        return {
            bankFilter: bankName,
            stageFilter: stageFilter || 'All',
            total: filtered.length,
            files: filtered.map(o => ({
                opportunityId: o.opportunityId,
                title: this.safe(o.title),
                stage: o.stage,
                loanType: this.safe(o.loanType),
                loanAmount: this.safe(o.loanAmount) || this.safe(o.estimatedRevenue),
                estimatedCloseDate: o.estimatedCloseDate,
                applicantType: o.applicantType,
                banks: (o.banks || []).map((b: any) => b.bankName || b.name).filter(Boolean),
                owner: o.owner ? `${o.owner.firstName} ${o.owner.lastName}` : 'Unassigned'
            }))
        };
    }

    async updateLeadStatus(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { leadId, status, rating } = params;

        if (!leadId) throw new Error("leadId is required.");
        if (!status && !rating) throw new Error("At least one of status or rating must be provided.");

        const validStatuses = ['New', 'In Progress', 'Qualified', 'Closed'];
        const validRatings = ['Hot', 'Warm', 'Cold'];

        if (status && !validStatuses.includes(status)) {
            throw new Error(`Invalid status: "${status}". Valid values: ${validStatuses.join(' | ')}`);
        }
        if (rating && !validRatings.includes(rating)) {
            throw new Error(`Invalid rating: "${rating}". Valid values: ${validRatings.join(' | ')}`);
        }

        const leadRepo = AppDataSource.getRepository(Lead);
        const lead = await leadRepo.findOne({
            where: { leadId, organizationId: ctx.orgId } as any
        });

        if (!lead) throw new Error(`Lead not found or not in your organization: ${leadId}`);

        if (status) (lead as any).status = status;
        if (rating) (lead as any).rating = rating;

        await leadRepo.save(lead);

        return {
            leadId,
            fullName: this.safe(lead.fullName),
            phone: this.safe(lead.phone),
            loanType: this.safe(lead.loanType),
            status: lead.status,
            rating: lead.rating,
            updatedAt: new Date().toISOString()
        };
    }

    async convertLeadToOpportunity(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { leadId, loanType, estimatedRevenue, estimatedCloseDate, banks = [] } = params;

        if (!leadId) throw new Error("leadId is required.");
        if (!loanType) throw new Error("loanType is required (e.g. 'Housing Loan - Home Loan - HL').");
        if (!estimatedRevenue) throw new Error("estimatedRevenue (loan amount in INR) is required.");

        const leadRepo = AppDataSource.getRepository(Lead);
        const lead = await leadRepo.findOne({
            where: { leadId, organizationId: ctx.orgId } as any,
            relations: ['company', 'contact', 'owner', 'organization']
        });

        if (!lead) throw new Error(`Lead not found or not in your organization: ${leadId}`);

        const oppRepo = AppDataSource.getRepository(Oppurtunity);

        const opp = new Oppurtunity({} as Oppurtunity);
        opp.opportunityId = uuidv4();
        (opp as any).title = `${this.safe(lead.fullName)} - ${loanType}`;
        (opp as any).stage = 'Document Collection';
        (opp as any).status = 'Active';
        (opp as any).loanType = loanType;
        (opp as any).loanAmount = String(estimatedRevenue);
        (opp as any).estimatedRevenue = String(estimatedRevenue);
        (opp as any).estimatedCloseDate = estimatedCloseDate ? new Date(estimatedCloseDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // default 90 days
        if (lead.owner) (opp as any).owner = lead.owner;
        if (lead.organization) (opp as any).organization = lead.organization;
        if (lead.company) (opp as any).company = lead.company;
        if (lead.contact) (opp as any).contact = lead.contact;
        (opp as any).Lead = lead;

        // Associate banks
        if (banks.length > 0) {
            const bankRepo = AppDataSource.getRepository(Bank);
            const bankEntities = await bankRepo.createQueryBuilder('bank')
                .where('LOWER(bank.bankName) IN (:...names)', {
                    names: banks.map((b: string) => b.toLowerCase())
                })
                .getMany();
            (opp as any).banks = bankEntities;
        }

        const saved = await oppRepo.save(opp);

        // Mark lead as Qualified
        (lead as any).status = 'Qualified';
        (lead as any).wasQualified = true;
        await leadRepo.save(lead);

        return {
            opportunityId: saved.opportunityId,
            title: this.safe(saved.title),
            stage: (saved as any).stage,
            loanType: this.safe(saved.loanType),
            loanAmount: this.safe(saved.loanAmount),
            estimatedCloseDate: (saved as any).estimatedCloseDate,
            leadConverted: { leadId, name: this.safe(lead.fullName), statusNow: 'Qualified' },
            banksLinked: (saved.banks || []).map((b: any) => b.bankName || b.name).filter(Boolean)
        };
    }

    async getCases(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { status, priority, limit = 10 } = params;

        const caseRepo = AppDataSource.getRepository(Case);
        const query = caseRepo.createQueryBuilder('case')
            .leftJoinAndSelect('case.customer', 'customer')
            .leftJoinAndSelect('case.createdBy', 'createdBy')
            .leftJoinAndSelect('case.assignedTechnician', 'technician')
            .where('case.organizationId = :orgId', { orgId: ctx.orgId });

        if (status) query.andWhere('case.status = :status', { status });
        if (priority) query.andWhere('case.priority = :priority', { priority });

        query.orderBy('case.createdAt', 'DESC').limit(Number(limit));

        const cases = await query.getMany();

        if (cases.length === 0) return { message: `No cases found with given filters.`, cases: [] };

        return {
            total: cases.length,
            cases: cases.map(c => ({
                caseId: c.caseId,
                caseNumber: c.caseNumber,
                title: c.title,
                status: c.status,
                priority: c.priority,
                category: c.category,
                productName: c.productName,
                customer: c.customer ? this.safe(c.customer.fullName) : 'Unknown',
                assignedTechnician: c.assignedTechnician ? `${(c.assignedTechnician as any).firstName} ${(c.assignedTechnician as any).lastName}` : 'Unassigned',
                issueReportedDate: c.issueReportedDate,
                createdAt: c.createdAt
            }))
        };
    }

    async createLead(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);

        const {
            fullName, phone, loanType, loanAmount,
            email, city = 'Pune', state = 'Maharashtra', country = 'India',
            zone, taluka, village, pincode,
            leadSource = 'Direct', rating = 'Cold', description,
            title
        } = params;

        // Required field validation
        if (!fullName || fullName.trim() === '') throw new Error("Customer full name is required.");
        if (!phone || phone.trim() === '') throw new Error("Customer phone number is required.");
        if (!loanType) throw new Error("Loan type is required (e.g. 'Housing Loan - Home Loan - HL').");

        const leadRepo = AppDataSource.getRepository(Lead);

        // Duplicate check: warn if phone already exists in org
        // (phone is encrypted, so we encrypt the search value)
        const encryptedPhone = encryption(phone);
        const existing = await leadRepo.findOne({
            where: { phone: encryptedPhone, organizationId: ctx.orgId } as any
        });
        if (existing) {
            return {
                duplicate: true,
                existingLeadId: existing.leadId,
                message: `A lead with phone ${phone} already exists in the system. Lead ID: ${existing.leadId}. Use updateLeadStatus to update this lead instead.`
            };
        }

        const lead = new Lead({} as Lead);
        lead.leadId = uuidv4();
        lead.fullName = fullName;
        lead.phone = phone;
        lead.email = email || '';
        lead.title = title || `${loanType} Inquiry`;
        lead.loanType = loanType;
        lead.loanAmount = loanAmount ? String(loanAmount) : '';
        lead.city = city;
        lead.state = state;
        lead.country = country;
        lead.leadSource = leadSource;
        (lead as any).rating = rating;
        (lead as any).status = 'New';
        lead.description = description || '';
        if (zone) lead.zone = zone;
        if (taluka) lead.taluka = taluka;
        if (village) lead.village = village;
        if (pincode) lead.pincode = pincode;

        // Assign owner and organisation
        const owner = await AppDataSource.getRepository(User).findOne({ where: { userId: ctx.userId } });
        const organization = await AppDataSource.getRepository(Organisation).findOne({ where: { organisationId: ctx.orgId! } });
        if (owner) lead.owner = owner;
        if (organization) lead.organization = organization;

        const saved = await leadRepo.save(lead);

        return {
            success: true,
            leadId: saved.leadId,
            fullName,
            phone,
            loanType,
            loanAmount: loanAmount || null,
            city,
            rating,
            status: 'New',
            owner: owner ? `${owner.firstName} ${owner.lastName}` : 'You',
            message: `Lead created successfully for ${fullName}. Lead ID: ${saved.leadId}`
        };
    }
}
