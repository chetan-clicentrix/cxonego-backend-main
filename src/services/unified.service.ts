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
import { AgentSkill } from "../entity/AgentSkill";
import { vectorService } from "./vector.service";
import { In, Like, Between } from "typeorm";
import { decrypt, encryption, statusType, stage, opportunityStatus } from "../common/utils";
import { v4 as uuidv4 } from "uuid";
import LeadService from "./lead.service";
import opportunityService from "./oppurtunity.service";
import ActivityService from "./activity.service";
import * as ExcelJS from "exceljs";
import { notificationService } from "./notification.service";
import * as path from "path";
import * as fs from "fs";

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

    // ─── Universal Data Engine (Enhanced smartSearch) ──────────────────────────────
    async smartSearch(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { query, entityTypes = ['all'], filters = {}, groupBy, limit = 10 } = params;

        if (!query && Object.keys(filters).length === 0 && !groupBy) {
            throw new Error("Provide a search query, filters, or a groupBy attribute.");
        }

        const { orgId, userId } = ctx;
        const results: any = { leads: [], opportunities: [], accounts: [], contacts: [], activities: [] };

        // Helper to apply dynamic filters to a QueryBuilder SAFELY
        const applyDynamicFilters = (qb: any, entityAlias: string, validColumns: string[], encryptedColumns: string[] = []) => {
            const postFilters: Record<string, any> = {};

            Object.keys(filters).forEach(key => {
                if (key === 'ownerId' && filters[key] === 'mine') {
                    qb.andWhere(`${entityAlias}.ownerId = :userId`, { userId });
                    return;
                }

                // Protect against unknown columns
                if (!validColumns.includes(key)) return;

                const value = filters[key];

                // If column is encrypted, we cannot query it in SQL. Save for post-fetch filtering.
                if (encryptedColumns.includes(key)) {
                    postFilters[key] = value;
                    return;
                }

                const paramName = `${entityAlias}_${key}`;

                if (Array.isArray(value)) {
                    qb.andWhere(`${entityAlias}.${key} IN (:...${paramName})`, { [paramName]: value });
                } else if (typeof value === 'string' && value.includes('>')) {
                    qb.andWhere(`${entityAlias}.${key} > :${paramName}`, { [paramName]: value.replace('>', '').trim() });
                } else if (typeof value === 'string' && value.includes('<')) {
                    qb.andWhere(`${entityAlias}.${key} < :${paramName}`, { [paramName]: value.replace('<', '').trim() });
                } else {
                    qb.andWhere(`${entityAlias}.${key} = :${paramName}`, { [paramName]: value });
                }
            });

            return postFilters;
        };

        // ── Search Leads ──
        if (entityTypes.includes('all') || entityTypes.includes('lead')) {
            const leadRepo = AppDataSource.getRepository(Lead);
            const leadQuery = leadRepo.createQueryBuilder('lead')
                .leftJoinAndSelect('lead.owner', 'owner')
                .leftJoinAndSelect('lead.company', 'company')
                .where('lead.organizationId = :orgId', { orgId });

            const validLeadCols = ['leadId', 'fullName', 'phone', 'email', 'loanType', 'loanAmount', 'city', 'state', 'zone', 'taluka', 'village', 'pincode', 'status', 'rating', 'leadSource', 'ownerId'];
            const encryptedLeadCols = ['fullName', 'phone', 'email', 'city', 'state', 'zone', 'taluka', 'village', 'pincode'];
            const postFilters = applyDynamicFilters(leadQuery, 'lead', validLeadCols, encryptedLeadCols);

            if (groupBy) {
                // If groupBy is requested on an encrypted column, warn/abort because SQL GROUP BY fails on encrypted strings
                if (encryptedLeadCols.includes(groupBy)) {
                    throw new Error(`Cannot groupBy an encrypted column like '${groupBy}'. Try grouping by status, rating, or loanType.`);
                }
                const aggregated = await leadQuery
                    .select(`lead.${groupBy}`, 'groupKey')
                    .addSelect('COUNT(lead.leadId)', 'count')
                    .groupBy(`lead.${groupBy}`)
                    .getRawMany();
                results.leads = { aggregated: true, data: aggregated };
            } else {
                let allLeads = await leadQuery.getMany();

                // 1. Apply Search Query
                if (query) {
                    allLeads = allLeads.filter(lead =>
                        this.matchesQuery(lead.fullName, query) ||
                        this.matchesQuery(lead.phone, query) ||
                        this.matchesQuery(lead.email, query) ||
                        this.matchesQuery(lead.city, query) ||
                        this.matchesQuery(lead.zone, query) ||
                        this.matchesQuery(lead.taluka, query) ||
                        this.matchesQuery(lead.loanType, query)
                    );
                }

                // 2. Apply Post Filters (Encrypted columns skipped by SQL)
                if (Object.keys(postFilters).length > 0) {
                    allLeads = allLeads.filter(lead => {
                        return Object.entries(postFilters).every(([key, value]) => {
                            const leadVal = (lead as any)[key];
                            if (Array.isArray(value)) {
                                // Match exact decrypted value within array
                                return value.some(v => this.safe(leadVal) === String(v));
                            }
                            // Fuzzy match
                            return this.matchesQuery(leadVal, String(value));
                        });
                    });
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
                    state: this.safe(l.state),
                    owner: l.owner ? { userId: l.owner.userId, name: `${l.owner.firstName} ${l.owner.lastName}` } : null
                }));
            }
        }

        // ── Search Proposals (Opportunities) ──
        if (entityTypes.includes('all') || entityTypes.includes('opportunity')) {
            const oppRepo = AppDataSource.getRepository(Oppurtunity);
            const oppQuery = oppRepo.createQueryBuilder('opp')
                .leftJoinAndSelect('opp.owner', 'owner')
                .leftJoinAndSelect('opp.company', 'company')
                .leftJoinAndSelect('opp.contact', 'contact')
                .leftJoinAndSelect('opp.banks', 'banks')
                .where('opp.organizationId = :orgId', { orgId });

            // Handle bank filter specially due to ManyToMany relation
            if (filters.bank) {
                oppQuery.andWhere('banks.bankId = :bankOrName OR banks.name LIKE :bankNameLike', {
                    bankOrName: filters.bank,
                    bankNameLike: `%${filters.bank}%`
                });
                const tempFilters = { ...filters };
                delete tempFilters.bank;
                // apply remaining dynamically
                Object.assign(filters, tempFilters); // Note: we're mutating the object but it's fine for this context
            }

            const validOppCols = ['opportunityId', 'title', 'stage', 'status', 'loanType', 'loanAmount', 'estimatedRevenue', 'ownerId', 'companyAccountId', 'contactContactId'];
            const encryptedOppCols = ['title', 'loanAmount', 'estimatedRevenue'];
            const postFilters = applyDynamicFilters(oppQuery, 'opp', validOppCols, encryptedOppCols);

            if (groupBy) {
                if (encryptedOppCols.includes(groupBy)) {
                    throw new Error(`Cannot groupBy an encrypted column like '${groupBy}'. Try grouping by stage, status, or loanType.`);
                }
                if (groupBy === 'bank' || groupBy === 'banks') {
                    // Special complex group by for many-to-many banks
                    const aggregated = await oppQuery
                        .select('banks.name', 'groupKey')
                        .addSelect('COUNT(DISTINCT opp.opportunityId)', 'count')
                        .addSelect('SUM(CAST(opp.estimatedRevenue AS DECIMAL))', 'revenue') // Note: might fail if encrypted
                        .groupBy('banks.name')
                        .getRawMany();
                    results.opportunities = { aggregated: true, data: aggregated };
                } else {
                    const aggregated = await oppQuery
                        .select(`opp.${groupBy}`, 'groupKey')
                        .addSelect('COUNT(opp.opportunityId)', 'count')
                        .groupBy(`opp.${groupBy}`)
                        .getRawMany();
                    results.opportunities = { aggregated: true, data: aggregated };
                }
            } else {
                let allOpps = await oppQuery.getMany();

                if (query) {
                    allOpps = allOpps.filter(opp =>
                        this.matchesQuery(opp.title, query) ||
                        this.matchesQuery(opp.loanType, query) ||
                        (opp.company && this.matchesQuery(opp.company.accountName, query)) ||
                        (opp.contact && (this.matchesQuery(opp.contact.fullName, query) || this.matchesQuery(opp.contact.phone, query)))
                    );
                }

                if (Object.keys(postFilters).length > 0) {
                    allOpps = allOpps.filter(opp => {
                        return Object.entries(postFilters).every(([key, value]) => {
                            const oppVal = (opp as any)[key];
                            if (Array.isArray(value)) return value.some(v => this.safe(oppVal) === String(v));
                            return this.matchesQuery(oppVal, String(value));
                        });
                    });
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
                    applicantType: o.applicantType,
                    banks: (o.banks || []).map((b: any) => b.bankName || b.name).filter(Boolean),
                    client: o.company ? { accountId: o.company.accountId, name: this.safe(o.company.accountName) } : null,
                    owner: o.owner ? { userId: o.owner.userId, name: `${o.owner.firstName} ${o.owner.lastName}` } : null
                }));
            }
        }

        // ── Search Clients (Accounts) ──
        if (entityTypes.includes('all') || entityTypes.includes('account')) {
            const accRepo = AppDataSource.getRepository(Account);
            const accQuery = accRepo.createQueryBuilder('acc')
                .leftJoinAndSelect('acc.owner', 'owner')
                .where('acc.organizationId = :orgId', { orgId });

            const validAccCols = ['accountId', 'accountName', 'phone', 'email', 'website', 'industry', 'companyType', 'status', 'ownerId'];
            const encryptedAccCols = ['accountName', 'phone', 'email', 'website', 'industry'];
            const postFilters = applyDynamicFilters(accQuery, 'acc', validAccCols, encryptedAccCols);

            if (groupBy) {
                if (encryptedAccCols.includes(groupBy)) {
                    throw new Error(`Cannot groupBy an encrypted column like '${groupBy}'. Try grouping by status or companyType.`);
                }
                const aggregated = await accQuery
                    .select(`acc.${groupBy}`, 'groupKey')
                    .addSelect('COUNT(acc.accountId)', 'count')
                    .groupBy(`acc.${groupBy}`)
                    .getRawMany();
                results.accounts = { aggregated: true, data: aggregated };
            } else {
                let allAccs = await accQuery.getMany();

                if (query) {
                    allAccs = allAccs.filter(acc =>
                        this.matchesQuery(acc.accountName, query) ||
                        this.matchesQuery(acc.phone, query) ||
                        this.matchesQuery(acc.industry, query) ||
                        this.matchesQuery(acc.city, query)
                    );
                }

                if (Object.keys(postFilters).length > 0) {
                    allAccs = allAccs.filter(acc => {
                        return Object.entries(postFilters).every(([key, value]) => {
                            const accVal = (acc as any)[key];
                            if (Array.isArray(value)) return value.some(v => this.safe(accVal) === String(v));
                            return this.matchesQuery(accVal, String(value));
                        });
                    });
                }

                results.accounts = allAccs.slice(0, limit).map(a => ({
                    accountId: a.accountId,
                    accountName: this.safe(a.accountName),
                    phone: this.safe(a.phone),
                    website: this.safe(a.website),
                    industry: this.safe(a.industry),
                    annualRevenue: this.safe(a.annualRevenue),
                    city: this.safe(a.city),
                    owner: a.owner ? { userId: a.owner.userId, name: `${a.owner.firstName} ${a.owner.lastName}` } : null
                }));
            }
        }

        // ── Search Contacts ──
        if (entityTypes.includes('all') || entityTypes.includes('contact')) {
            const contactRepo = AppDataSource.getRepository(Contact);
            const contactQuery = contactRepo.createQueryBuilder('con')
                .leftJoinAndSelect('con.owner', 'owner')
                .leftJoinAndSelect('con.company', 'company')
                .where('con.organizationId = :orgId', { orgId });

            const validContCols = ['contactId', 'firstName', 'lastName', 'phone', 'email', 'title', 'ownerId', 'accountAccountId'];
            const encryptedContCols = ['firstName', 'lastName', 'phone', 'email', 'title'];
            const postFilters = applyDynamicFilters(contactQuery, 'con', validContCols, encryptedContCols);

            if (groupBy) {
                if (encryptedContCols.includes(groupBy)) {
                    throw new Error(`Cannot groupBy an encrypted column like '${groupBy}'.`);
                }
                const aggregated = await contactQuery
                    .select(`con.${groupBy}`, 'groupKey')
                    .addSelect('COUNT(con.contactId)', 'count')
                    .groupBy(`con.${groupBy}`)
                    .getRawMany();
                results.contacts = { aggregated: true, data: aggregated };
            } else {
                let allCons = await contactQuery.getMany();

                if (query) {
                    allCons = allCons.filter(con =>
                        this.matchesQuery(con.fullName, query) ||
                        this.matchesQuery(con.phone, query) ||
                        this.matchesQuery(con.email, query) ||
                        (con.company && this.matchesQuery(con.company.accountName, query))
                    );
                }

                if (Object.keys(postFilters).length > 0) {
                    allCons = allCons.filter(con => {
                        return Object.entries(postFilters).every(([key, value]) => {
                            const conVal = (con as any)[key];
                            if (Array.isArray(value)) return value.some(v => this.safe(conVal) === String(v));
                            return this.matchesQuery(conVal, String(value));
                        });
                    });
                }

                results.contacts = allCons.slice(0, limit).map(c => ({
                    contactId: c.contactId,
                    fullName: this.safe(c.fullName),
                    phone: this.safe(c.phone),
                    email: this.safe(c.email),
                    client: c.company ? { accountId: c.company.accountId, name: this.safe(c.company.accountName) } : null,
                    owner: c.owner ? { userId: c.owner.userId, name: `${c.owner.firstName} ${c.owner.lastName}` } : null
                }));
            }
        }

        // ── Search Activities ──
        if (entityTypes.includes('all') || entityTypes.includes('activity')) {
            const actRepo = AppDataSource.getRepository(Activity);
            const actQuery = actRepo.createQueryBuilder('act')
                .leftJoinAndSelect('act.owner', 'owner')
                .leftJoinAndSelect('act.lead', 'lead')
                .leftJoinAndSelect('act.opportunity', 'opportunity')
                .where('act.organizationId = :orgId', { orgId });

            const validActCols = ['activityId', 'subject', 'activityType', 'status', 'priority', 'assignedToUserId'];
            applyDynamicFilters(actQuery, 'act', validActCols);

            if (groupBy) {
                const aggregated = await actQuery
                    .select(`act.${groupBy}`, 'groupKey')
                    .addSelect('COUNT(act.activityId)', 'count')
                    .groupBy(`act.${groupBy}`)
                    .getRawMany();
                results.activities = { aggregated: true, data: aggregated };
            } else {
                let allActs = await actQuery.getMany();

                if (query) {
                    allActs = allActs.filter(act =>
                        this.matchesQuery(act.subject, query) ||
                        this.matchesQuery(act.description, query)
                    );
                }

                results.activities = allActs.slice(0, limit).map(a => ({
                    activityId: a.activityId,
                    subject: a.subject,
                    type: a.activityType,
                    status: a.activityStatus,
                    priority: a.activityPriority,
                    dueDate: a.dueDate,
                    relatedLead: a.lead ? { leadId: a.lead.leadId, name: this.safe(a.lead.fullName) } : null,
                    relatedProposal: a.opportunity ? { opportunityId: a.opportunity.opportunityId, title: this.safe(a.opportunity.title) } : null,
                    owner: a.owner ? { userId: a.owner.userId, name: `${a.owner.firstName} ${a.owner.lastName}` } : null
                }));
            }
        }

        // Clean up empty result arrays to save tokens for the LLM
        Object.keys(results).forEach(key => {
            if (Array.isArray(results[key]) && results[key].length === 0) delete results[key];
            else if (results[key].aggregated && results[key].data.length === 0) delete results[key];
        });

        return results;
    }

    async getDashboard(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        if (!ctx.userId && !params.userId) {
            throw new Error("Auth context missing: userId required for dashboard. Provide userId in params for manager view.");
        }

        const { timeRange = 'week', groupBy } = params;
        const targetUserId = params.userId || ctx.userId;

        const now = new Date();
        let startDate = new Date();
        switch (timeRange) {
            case 'today': startDate.setHours(0, 0, 0, 0); break;
            case 'week': startDate.setDate(now.getDate() - 7); break;
            case 'month': startDate.setMonth(now.getMonth() - 1); break;
            case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
            case 'all': startDate = new Date(0); break;
        }

        const leadRepo = AppDataSource.getRepository(Lead);
        const oppRepo = AppDataSource.getRepository(Oppurtunity);
        const actRepo = AppDataSource.getRepository(Activity);

        // If groupBy is provided, return grouped analytics
        if (groupBy) {
            let aggregatedData: any[] = [];

            if (['bank', 'banks'].includes(groupBy)) {
                // Bank-wise pipeline breakdown
                const oppQuery = oppRepo.createQueryBuilder('opp')
                    .leftJoinAndSelect('opp.banks', 'banks')
                    .where('opp.organizationId = :orgId', { orgId: ctx.orgId })
                    .andWhere('opp.status IN (:...status)', { status: ['Active', 'Won', 'Lost'] });

                if (targetUserId !== 'all') oppQuery.andWhere('opp.ownerId = :userId', { userId: targetUserId });

                aggregatedData = await oppQuery
                    .select('banks.name', 'groupKey')
                    .addSelect('COUNT(DISTINCT opp.opportunityId)', 'count')
                    .addSelect('SUM(CAST(opp.estimatedRevenue AS DECIMAL))', 'totalValue')
                    .groupBy('banks.name')
                    .getRawMany();

            } else {
                // Generic grouping for opportunities (stage, loanType, etc.)
                const oppQuery = oppRepo.createQueryBuilder('opp')
                    .where('opp.organizationId = :orgId', { orgId: ctx.orgId });

                if (targetUserId !== 'all') oppQuery.andWhere('opp.ownerId = :userId', { userId: targetUserId });

                aggregatedData = await oppQuery
                    .select(`opp.${groupBy}`, 'groupKey')
                    .addSelect('COUNT(opp.opportunityId)', 'count')
                    .groupBy(`opp.${groupBy}`)
                    .getRawMany();
            }

            return {
                timeRange,
                groupBy,
                aggregated: true,
                data: aggregatedData
            };
        }

        // Standard metrics
        const [
            totalLeads, newLeads, qualifiedLeads, hotLeads,
            totalOpportunities, activeOpportunities, wonOpportunities, lostOpportunities,
            upcomingActivities, overdueActivities, completedActivities
        ] = await Promise.all([
            leadRepo.count({ where: { owner: { userId: targetUserId } }, loadEagerRelations: false } as any),
            leadRepo.count({ where: { owner: { userId: targetUserId }, status: 'New' as any, createdAt: Between(startDate, now) }, loadEagerRelations: false } as any),
            leadRepo.count({ where: { owner: { userId: targetUserId }, status: 'Qualified' as any }, loadEagerRelations: false } as any),
            leadRepo.count({ where: { owner: { userId: targetUserId }, rating: 'Hot' as any }, loadEagerRelations: false } as any),
            oppRepo.count({ where: { owner: { userId: targetUserId } }, loadEagerRelations: false } as any),
            oppRepo.count({ where: { owner: { userId: targetUserId }, status: 'Active' as any }, loadEagerRelations: false } as any),
            oppRepo.count({ where: { owner: { userId: targetUserId }, status: 'Won' as any, actualCloseDate: Between(startDate, now) }, loadEagerRelations: false } as any),
            oppRepo.count({ where: { owner: { userId: targetUserId }, status: 'Lost' as any, actualCloseDate: Between(startDate, now) }, loadEagerRelations: false } as any),
            actRepo.count({ where: { owner: { userId: targetUserId }, activityStatus: 'Open' as any, dueDate: Between(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)) }, loadEagerRelations: false } as any),
            actRepo.count({ where: { owner: { userId: targetUserId }, activityStatus: 'Open' as any, dueDate: Between(new Date(0), now) }, loadEagerRelations: false } as any),
            actRepo.count({ where: { owner: { userId: targetUserId }, activityStatus: 'Completed' as any, actualEndDate: Between(startDate, now) }, loadEagerRelations: false } as any)
        ]);

        const pipelineOpps = await oppRepo.find({ where: { owner: { userId: targetUserId }, status: 'Active' as any }, loadEagerRelations: false, select: ['estimatedRevenue'] } as any);
        const pipelineValue = pipelineOpps.reduce((sum, opp) => {
            const revenue = parseInt(this.safe(opp.estimatedRevenue) || '0');
            return sum + (isNaN(revenue) ? 0 : revenue);
        }, 0);

        const wonOpps = await oppRepo.find({ where: { owner: { userId: targetUserId }, status: 'Won' as any, actualCloseDate: Between(startDate, now) }, loadEagerRelations: false, select: ['loanAmount', 'estimatedRevenue'] } as any);
        let disbursedVolume = 0;
        wonOpps.forEach(opp => {
            let r = parseInt(this.safe(opp.loanAmount) || this.safe(opp.estimatedRevenue) || '0');
            if (!isNaN(r)) disbursedVolume += r;
        });

        return {
            timeRange,
            leads: { total: totalLeads, new: newLeads, qualified: qualifiedLeads, hot: hotLeads },
            opportunities: { total: totalOpportunities, active: activeOpportunities, won: wonOpportunities, lost: lostOpportunities, pipelineValue },
            activities: { upcoming: upcomingActivities, overdue: overdueActivities, completed: completedActivities },
            financials: { pipelineValue, disbursedVolume },
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
        const activityService = new ActivityService();
        const activity = new Activity({} as Activity);
        activity.activityId = await activityService.getActivityId(new Date());
        activity.subject = subject;

        // Map AI types to strict ENUM fields
        let mappedType = activityType;
        if (activityType === 'CALL') mappedType = 'Phone Call Outbound';
        if (activityType === 'MEETING') mappedType = 'Meeting';
        if (activityType === 'EMAIL') mappedType = 'Email Outbound';
        if (activityType === 'TASK') mappedType = 'Task';

        let mappedPriority = priority;
        if (priority === 'HIGH') mappedPriority = 'High';
        if (priority === 'NORMAL') mappedPriority = 'Normal';
        if (priority === 'LOW') mappedPriority = 'Low';

        activity.activityType = mappedType as any;
        activity.activityStatus = 'Open' as any;
        activity.activityPriority = mappedPriority as any;
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

        if (!entityType) throw new Error("entityType is required: lead | opportunity | account | contact | case");
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
            .andWhere('opp.status IN (:...status)', { status: ['Active', 'Won', 'Lost'] });

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
        if (!newStage) throw new Error("newStage is required. Valid stages: Analysis | Solutioning | Closed");

        const validStages = Object.values(stage);
        if (!validStages.includes(newStage as stage)) {
            throw new Error(`Invalid stage: "${newStage}". Valid stages: ${validStages.join(' | ')}`);
        }

        const oppRepo = AppDataSource.getRepository(Oppurtunity);
        const opp = await oppRepo.findOne({
            where: { opportunityId, organization: { organisationId: ctx.orgId } } as any,
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
            .where('opp.organization = :orgId', { orgId: ctx.orgId })
            .andWhere('opp.status IN (:...status)', { status: ['Active', 'Won', 'Lost'] });

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
            where: { leadId, organization: { organisationId: ctx.orgId } } as any
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
            where: { leadId, organization: { organisationId: ctx.orgId } } as any,
            relations: ['company', 'contact', 'owner', 'organization']
        });

        if (!lead) throw new Error(`Lead not found or not in your organization: ${leadId}`);

        const oppRepo = AppDataSource.getRepository(Oppurtunity);

        const oppService = new opportunityService();
        const opp = new Oppurtunity({} as Oppurtunity);
        opp.opportunityId = await oppService.getOpportunityId(new Date());
        (opp as any).title = `${this.safe(lead.fullName)} - ${loanType}`;
        (opp as any).stage = 'Analysis';
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
            where: { phone: encryptedPhone, organization: { organisationId: ctx.orgId } } as any
        });
        if (existing) {
            return {
                duplicate: true,
                existingLeadId: existing.leadId,
                message: `A lead with phone ${phone} already exists in the system. Lead ID: ${existing.leadId}. Use updateLeadStatus to update this lead instead.`
            };
        }

        const leadService = new LeadService();
        const lead = new Lead({} as Lead);
        lead.leadId = await leadService.getLeadId(new Date());
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

    async listUsers(_params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const userRepo = AppDataSource.getRepository(User);
        const users = await userRepo.find({
            where: { organisation: { organisationId: ctx.orgId }, isActive: true },
            select: ["userId", "firstName", "lastName", "email"],
            loadEagerRelations: false
        });

        return {
            total: users.length,
            users: users.map(u => ({
                userId: u.userId,
                name: `${this.safe(u.firstName)} ${this.safe(u.lastName)}`.trim(),
                email: this.safe(u.email)
            }))
        };
    }

    async reassignEntity(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { entityType, entityId, newOwnerId, reason } = params;

        if (!entityType || !entityId || !newOwnerId) {
            throw new Error("entityType, entityId, and newOwnerId are required.");
        }

        const userRepo = AppDataSource.getRepository(User);
        const newOwner = await userRepo.findOne({
            where: { userId: newOwnerId, organisation: { organisationId: ctx.orgId } }
        });
        if (!newOwner) throw new Error("New owner not found in your organization.");

        let repo: any;
        let idField: string;
        let entityName: string;

        switch (entityType) {
            case 'lead': repo = AppDataSource.getRepository(Lead); idField = 'leadId'; entityName = 'Lead'; break;
            case 'opportunity': repo = AppDataSource.getRepository(Oppurtunity); idField = 'opportunityId'; entityName = 'Opportunity'; break;
            case 'activity': repo = AppDataSource.getRepository(Activity); idField = 'activityId'; entityName = 'Activity'; break;
            case 'note': repo = AppDataSource.getRepository(Note); idField = 'noteId'; entityName = 'Note'; break;
            default: throw new Error(`Invalid entityType: ${entityType}`);
        }

        const entity = await repo.findOne({
            where: { [idField]: entityId, organization: { organisationId: ctx.orgId } },
            relations: ['owner']
        });
        if (!entity) throw new Error(`${entityName} not found.`);

        const oldOwnerName = entity.owner ? `${this.safe(entity.owner.firstName)} ${this.safe(entity.owner.lastName)}` : 'Unassigned';
        entity.owner = newOwner;
        await repo.save(entity);

        // Notify new owner
        await notificationService.createNotification({
            userId: newOwnerId,
            title: `${entityName} Assigned to You`,
            message: `You have been assigned as the owner of ${entityName}: ${entity.title || entity.subject || entity.fullName || entityId}. Reassigned from ${oldOwnerName}.${reason ? ` Reason: ${reason}` : ''}`,
            type: entityType === 'opportunity' ? 'opportunity' : (entityType === 'lead' ? 'lead' : 'system'),
            entityId: entityId,
            entityType: entityName
        });

        return {
            success: true,
            message: `${entityName} successfully reassigned to ${this.safe(newOwner.firstName)} ${this.safe(newOwner.lastName)}.`,
            newOwner: `${this.safe(newOwner.firstName)} ${this.safe(newOwner.lastName)}`
        };
    }

    async qualifyLead(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { leadId, notes } = params;
        if (!leadId) throw new Error("leadId is required.");

        const leadRepo = AppDataSource.getRepository(Lead);
        const lead = await leadRepo.findOne({
            where: { leadId, organization: { organisationId: ctx.orgId } }
        });
        if (!lead) throw new Error("Lead not found.");

        (lead as any).status = 'Qualified';
        (lead as any).wasQualified = true;
        if (notes) lead.description = (lead.description || '') + `\n\n[Qualification Note]: ${notes}`;

        await leadRepo.save(lead);

        return {
            success: true,
            leadId,
            status: 'Qualified',
            message: `Lead ${this.safe(lead.fullName)} has been qualified.`
        };
    }

    async exportPipelineToExcel(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { data, fileNamePrefix = 'export' } = params;

        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error("No data provided for export.");
        }

        const templatePath = path.join(process.cwd(), 'src/templates/Export_Template.xlsx');
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template file not found at ${templatePath}.`);
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);

        // --- 1. POPULATE RAW DATA SHEET ---
        const rawSheet = workbook.getWorksheet('RawData');
        if (!rawSheet) throw new Error("Template must contain a 'RawData' worksheet");

        // Dynamically detect columns from the first object
        const sampleObj = data[0];
        const columns = Object.keys(sampleObj).map(key => ({
            header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(), // CamelCase to Title Case
            key: key,
            width: 20
        }));

        // Define columns starting at row 1
        rawSheet.columns = columns;

        // Add all rows
        data.forEach(item => {
            const rowData: any = {};
            columns.forEach(col => {
                let val = item[col.key];
                // Simple object flattening for objects like { name: 'Foo' }
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                    val = val.name || val.title || val.fullName || val.accountName || JSON.stringify(val);
                }
                // Convert arrays to comma strings
                if (Array.isArray(val)) {
                    val = val.join(', ');
                }
                rowData[col.key] = val;
            });
            rawSheet.addRow(rowData);
        });

        // --- 2. POPULATE ANALYSIS SHEET ---
        // We will look for a grouping key. By default 'status', 'stage', or 'rating'
        let groupKey = 'status';
        if (data[0].hasOwnProperty('stage')) groupKey = 'stage';
        else if (data[0].hasOwnProperty('rating') && !data[0].hasOwnProperty('status')) groupKey = 'rating';

        const mapCounts = new Map<string, number>();
        const mapRevenue = new Map<string, number>();

        data.forEach(item => {
            const category = item[groupKey] || 'Unknown';
            const val = parseFloat(item.loanAmount || item.estimatedRevenue || item.price || item.amount || '0');

            mapCounts.set(category, (mapCounts.get(category) || 0) + 1);
            if (!isNaN(val)) {
                mapRevenue.set(category, (mapRevenue.get(category) || 0) + val);
            }
        });

        const analysisSheet = workbook.getWorksheet('Analysis');
        if (analysisSheet) {
            // Clear existing rows (keep headers if they exist on row 1, but we'll safer just overwrite row 2 onwards)
            analysisSheet.spliceRows(2, analysisSheet.rowCount);

            Array.from(mapCounts.entries()).forEach(([category, count]) => {
                const revenue = mapRevenue.get(category) || 0;
                analysisSheet.addRow({
                    category: category,
                    count: count,
                    revenue: revenue
                });
            });
        }

        // --- 3. SAVE TO TEMP EXPORTS ---
        const fileName = `${fileNamePrefix}_${Date.now()}.xlsx`;
        const tempDir = path.join(process.cwd(), 'temp_exports');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const filePath = path.join(tempDir, fileName);

        await workbook.xlsx.writeFile(filePath);

        return {
            success: true,
            filePath,
            fileName,
            message: `Export generated with ${data.length} records.`,
            downloadUrl: `https://cx1.clicentrix.com/temp_exports/${fileName}`
        };
    }

    async learnAgentSkill(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { skillName, description, instructions, triggerKeywords } = params;

        if (!skillName || !instructions) {
            throw new Error("skillName and instructions are required for learning.");
        }

        const skillRepo = AppDataSource.getRepository(AgentSkill);

        // Find if name already exists in org to update or create new
        let skill = await skillRepo.findOne({
            where: { skillName, organization: { organisationId: ctx.orgId } }
        });

        if (skill) {
            skill.description = description || skill.description;
            skill.instructions = instructions;
            skill.triggerKeywords = triggerKeywords || skill.triggerKeywords;
        } else {
            skill = new AgentSkill({
                skillName,
                description,
                instructions,
                triggerKeywords,
                organization: { organisationId: ctx.orgId } as any,
                author: { userId: ctx.userId } as any
            });
        }

        // Generate embedding for "Name: Description (Keywords)"
        const embedText = `${skillName}: ${description || ''} (${triggerKeywords || ''})`;
        skill.embedding = await vectorService.generateEmbedding(embedText);

        await skillRepo.save(skill);

        return {
            success: true,
            skillId: skill.skillId,
            message: `Skill '${skillName}' has been learned with vector embeddings for optimized retrieval.`
        };
    }

    async findAgentSkills(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { query } = params;
        const skillRepo = AppDataSource.getRepository(AgentSkill);

        const skills = await skillRepo.find({
            where: { organization: { organisationId: ctx.orgId } }
        });

        if (!query) {
            return {
                total: skills.length,
                skills: skills.slice(0, 10).map(s => ({
                    skillName: s.skillName,
                    description: s.description,
                    instructions: s.instructions,
                    rating: s.rating
                }))
            };
        }

        // Similarity Search
        const queryVector = await vectorService.generateEmbedding(query);
        const scoredSkills = skills.map(s => {
            const similarity = s.embedding ? vectorService.cosineSimilarity(queryVector, s.embedding) : 0;
            return {
                skillName: s.skillName,
                description: s.description,
                instructions: s.instructions,
                triggerKeywords: s.triggerKeywords,
                rating: s.rating,
                similarity
            };
        });

        // Sort by similarity descending
        scoredSkills.sort((a, b) => b.similarity - a.similarity);

        // Filter by a threshold (e.g. 0.3)
        const topSkills = scoredSkills.filter(s => s.similarity > 0.2).slice(0, 5);

        return {
            total: topSkills.length,
            skills: topSkills,
            queryPerformed: query
        };
    }

    async createOpportunity(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { title, stageId = 'Analysis', loanType, loanAmount, estimatedRevenue, estimatedCloseDate, accountId, contactId, banks = [], description } = params;

        if (!title) throw new Error("title is required.");
        if (!loanType) throw new Error("loanType is required.");

        const oppRepo = AppDataSource.getRepository(Oppurtunity);

        const oppService = new opportunityService();
        const opp = new Oppurtunity({} as Oppurtunity);
        opp.opportunityId = await oppService.getOpportunityId(new Date());

        (opp as any).title = title;
        (opp as any).stage = stageId;
        (opp as any).status = 'Active';
        (opp as any).loanType = loanType;
        if (loanAmount) (opp as any).loanAmount = String(loanAmount);
        if (estimatedRevenue) (opp as any).estimatedRevenue = String(estimatedRevenue);
        if (description) (opp as any).description = description;
        (opp as any).estimatedCloseDate = estimatedCloseDate ? new Date(estimatedCloseDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

        const owner = await AppDataSource.getRepository(User).findOne({ where: { userId: ctx.userId } });
        const organization = await AppDataSource.getRepository(Organisation).findOne({ where: { organisationId: ctx.orgId! } });
        if (owner) (opp as any).owner = owner;
        if (organization) (opp as any).organization = organization;

        if (accountId) {
            const acc = await AppDataSource.getRepository(Account).findOne({ where: { accountId: accountId } });
            if (acc) (opp as any).company = acc;
        }
        if (contactId) {
            const con = await AppDataSource.getRepository(Contact).findOne({ where: { contactId: contactId } });
            if (con) (opp as any).contact = con;
        }

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

        return {
            opportunityId: saved.opportunityId,
            title: this.safe(saved.title),
            stage: (saved as any).stage,
            loanType: this.safe(saved.loanType),
            status: 'Active',
            owner: owner ? `${owner.firstName} ${owner.lastName}` : 'You',
            message: `Opportunity created successfully. ID: ${saved.opportunityId}`
        };
    }

    async updateLead(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { leadId, ...updates } = params;
        if (!leadId) throw new Error("leadId is required.");

        const leadRepo = AppDataSource.getRepository(Lead);
        const lead = await leadRepo.findOne({
            where: { leadId, organization: { organisationId: ctx.orgId } } as any
        });

        if (!lead) throw new Error(`Lead not found or not in your organization: ${leadId}`);

        const allowedFields = ['fullName', 'phone', 'email', 'title', 'loanType', 'loanAmount', 'city', 'state', 'country', 'zone', 'taluka', 'village', 'pincode', 'leadSource', 'rating', 'status', 'description'];

        let updatedCount = 0;
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                (lead as any)[field] = updates[field];
                updatedCount++;
            }
        }

        if (updatedCount === 0) throw new Error("No valid fields provided to update.");

        await leadRepo.save(lead);

        return {
            leadId,
            message: `Lead successfully updated with ${updatedCount} fields.`,
            updatedAt: new Date().toISOString()
        };
    }

    async updateOpportunity(params: any, ctx: ContextOptions) {
        this.requireOrg(ctx);
        const { opportunityId, ...updates } = params;
        if (!opportunityId) throw new Error("opportunityId is required.");

        const oppRepo = AppDataSource.getRepository(Oppurtunity);
        const opp = await oppRepo.findOne({
            where: { opportunityId, organization: { organisationId: ctx.orgId } } as any
        });

        if (!opp) throw new Error(`Opportunity not found or not in your organization: ${opportunityId}`);

        const allowedFields = ['title', 'stage', 'status', 'loanType', 'loanAmount', 'estimatedRevenue', 'estimatedCloseDate', 'description', 'probability', 'nextStep'];

        let updatedCount = 0;
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                if (field === 'estimatedCloseDate') {
                    (opp as any)[field] = new Date(updates[field]);
                } else if (field === 'loanAmount' || field === 'estimatedRevenue') {
                    (opp as any)[field] = String(updates[field]);
                } else {
                    (opp as any)[field] = updates[field];
                }
                updatedCount++;
            }
        }

        if (updatedCount === 0) throw new Error("No valid fields provided to update.");

        await oppRepo.save(opp);

        return {
            opportunityId,
            message: `Opportunity successfully updated with ${updatedCount} fields.`,
            updatedAt: new Date().toISOString()
        };
    }
}
