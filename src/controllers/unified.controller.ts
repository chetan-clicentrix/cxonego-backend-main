import { Request, Response } from "express";
import { AuthenticatedRequest } from "../interfaces/types";
import { makeResponse, encryption, decrypt, statusType } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AppDataSource } from "../data-source";
import { Lead } from "../entity/Lead";
import { Oppurtunity } from "../entity/Oppurtunity";
import { Account } from "../entity/Account";
import { Contact } from "../entity/Contact";
import { Activity } from "../entity/Activity";
import { User } from "../entity/User";
import { Organisation } from "../entity/Organisation";
import { In, Like, Between } from "typeorm";

/**
 * Unified API Controller for WhatsApp AI Agent
 * Provides comprehensive access to all CRM entities
 */
class UnifiedController {
    /**
     * Smart Search across all entities
     * Searches by phone, email, name across Leads, Accounts, Contacts, Opportunities
     */
    async smartSearch(request: AuthenticatedRequest, response: Response) {
        try {
            const { query, entityTypes = ['all'], filters = {}, limit = 10 } = request.body;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const userId = request.user?.userId;

            const results: any = {
                leads: [],
                opportunities: [],
                accounts: [],
                contacts: []
            };

            // Helper function for partial matching on decrypted data
            const matchesQuery = (value: string, searchQuery: string): boolean => {
                if (!value || !searchQuery) return false;
                try {
                    const decrypted = decrypt(value);
                    return decrypted.toLowerCase().includes(searchQuery.toLowerCase());
                } catch {
                    return false;
                }
            };

            // Search Leads
            if (entityTypes.includes('all') || entityTypes.includes('lead')) {
                const leadRepo = AppDataSource.getRepository(Lead);
                const leadQuery = leadRepo
                    .createQueryBuilder('lead')
                    .leftJoinAndSelect('lead.owner', 'owner')
                    .leftJoinAndSelect('lead.company', 'company')
                    .where('lead.organizationId = :orgId', { orgId });

                // Apply filters
                if (filters.ownerId === 'mine') {
                    leadQuery.andWhere('lead.ownerId = :userId', { userId });
                }
                if (filters.status) {
                    leadQuery.andWhere('lead.status = :status', { status: filters.status });
                }
                if (filters.rating) {
                    leadQuery.andWhere('lead.rating = :rating', { rating: filters.rating });
                }
                if (filters.city) {
                    leadQuery.andWhere('lead.city = :city', { city: filters.city });
                }

                // Fetch leads and filter in memory for partial matching
                let allLeads = await leadQuery.getMany();

                if (query) {
                    allLeads = allLeads.filter(lead =>
                        matchesQuery(lead.fullName, query) ||
                        matchesQuery(lead.phone, query) ||
                        matchesQuery(lead.email, query) ||
                        matchesQuery(lead.city, query)
                    );
                }

                results.leads = allLeads.slice(0, limit);
            }

            // Search Opportunities
            if (entityTypes.includes('all') || entityTypes.includes('opportunity')) {
                const oppRepo = AppDataSource.getRepository(Oppurtunity);
                const oppQuery = oppRepo
                    .createQueryBuilder('opp')
                    .leftJoinAndSelect('opp.owner', 'owner')
                    .leftJoinAndSelect('opp.company', 'company')
                    .leftJoinAndSelect('opp.contact', 'contact')
                    .leftJoinAndSelect('opp.bank', 'bank')
                    .where('opp.organizationId = :orgId', { orgId });

                if (filters.ownerId === 'mine') {
                    oppQuery.andWhere('opp.ownerId = :userId', { userId });
                }
                if (filters.stage) {
                    oppQuery.andWhere('opp.stage = :stage', { stage: filters.stage });
                }
                if (filters.status) {
                    oppQuery.andWhere('opp.status = :status', { status: filters.status });
                }

                let allOpps = await oppQuery.getMany();

                if (query) {
                    allOpps = allOpps.filter(opp =>
                        matchesQuery(opp.title, query) ||
                        (opp.company && matchesQuery(opp.company.accountName, query)) ||
                        (opp.contact && (
                            matchesQuery(opp.contact.fullName, query) ||
                            matchesQuery(opp.contact.phone, query)
                        ))
                    );
                }

                results.opportunities = allOpps.slice(0, limit);
            }

            // Search Accounts
            if (entityTypes.includes('all') || entityTypes.includes('account')) {
                const accountRepo = AppDataSource.getRepository(Account);
                const accountQuery = accountRepo
                    .createQueryBuilder('account')
                    .leftJoinAndSelect('account.owner', 'owner')
                    .where('account.organizationId = :orgId', { orgId });

                let allAccounts = await accountQuery.getMany();

                if (query) {
                    allAccounts = allAccounts.filter(account =>
                        matchesQuery(account.accountName, query) ||
                        matchesQuery(account.phone, query) ||
                        matchesQuery(account.email, query) ||
                        matchesQuery(account.city, query)
                    );
                }

                results.accounts = allAccounts.slice(0, limit);
            }

            // Search Contacts
            if (entityTypes.includes('all') || entityTypes.includes('contact')) {
                const contactRepo = AppDataSource.getRepository(Contact);
                const contactQuery = contactRepo
                    .createQueryBuilder('contact')
                    .leftJoinAndSelect('contact.company', 'company')
                    .where('contact.organizationId = :orgId', { orgId });

                let allContacts = await contactQuery.getMany();

                if (query) {
                    allContacts = allContacts.filter(contact =>
                        matchesQuery(contact.fullName, query) ||
                        matchesQuery(contact.phone, query) ||
                        matchesQuery(contact.email, query)
                    );
                }

                results.contacts = allContacts.slice(0, limit);
            }

            return makeResponse(response, 200, true, "Search completed", results);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Get Dashboard Metrics
     * Returns comprehensive dashboard data for analytics
     */
    async getDashboard(request: AuthenticatedRequest, response: Response) {
        try {
            const { timeRange = 'week', userId } = request.query;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const requestUserId = (userId as string) || request.user?.userId;

            // Calculate date range
            const now = new Date();
            let startDate = new Date();

            switch (timeRange) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'quarter':
                    startDate.setMonth(now.getMonth() - 3);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
            }

            const leadRepo = AppDataSource.getRepository(Lead);
            const oppRepo = AppDataSource.getRepository(Oppurtunity);
            const actRepo = AppDataSource.getRepository(Activity);

            // Fetch metrics concurrently
            const [
                totalLeads,
                newLeads,
                qualifiedLeads,
                hotLeads,
                totalOpportunities,
                activeOpportunities,
                wonOpportunities,
                lostOpportunities,
                upcomingActivities,
                overdueActivities,
                completedActivities
            ] = await Promise.all([
                leadRepo.count({ where: { ownerId: requestUserId } as any }),
                leadRepo.count({
                    where: {
                        ownerId: requestUserId,
                        status: 'NEW',
                        createdAt: Between(startDate, now)
                    } as any
                }),
                leadRepo.count({
                    where: {
                        ownerId: requestUserId,
                        status: 'QUALIFIED'
                    } as any
                }),
                leadRepo.count({
                    where: {
                        ownerId: requestUserId,
                        rating: 'HOT'
                    } as any
                }),
                oppRepo.count({ where: { ownerId: requestUserId } as any }),
                oppRepo.count({
                    where: {
                        ownerId: requestUserId,
                        status: 'ACTIVE'
                    } as any
                }),
                oppRepo.count({
                    where: {
                        ownerId: requestUserId,
                        status: 'WON',
                        actualCloseDate: Between(startDate, now)
                    } as any
                }),
                oppRepo.count({
                    where: {
                        ownerId: requestUserId,
                        status: 'LOST',
                        actualCloseDate: Between(startDate, now)
                    } as any
                }),
                actRepo.count({
                    where: {
                        ownerId: requestUserId,
                        activityStatus: 'OPEN',
                        dueDate: Between(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
                    } as any
                }),
                actRepo.count({
                    where: {
                        ownerId: requestUserId,
                        activityStatus: 'OPEN',
                        dueDate: Between(new Date(0), now)
                    } as any
                }),
                actRepo.count({
                    where: {
                        ownerId: requestUserId,
                        activityStatus: 'COMPLETED',
                        actualEndDate: Between(startDate, now)
                    } as any
                })
            ]);

            // Calculate pipeline value
            const pipelineOpps = await oppRepo.find({
                where: {
                    ownerId: requestUserId,
                    status: 'ACTIVE'
                } as any
            });

            const pipelineValue = pipelineOpps.reduce((sum, opp) => {
                const revenue = parseInt(decrypt(opp.estimatedRevenue) || '0');
                return sum + revenue;
            }, 0);

            const metrics = {
                timeRange,
                leads: {
                    total: totalLeads,
                    new: newLeads,
                    qualified: qualifiedLeads,
                    hot: hotLeads
                },
                opportunities: {
                    total: totalOpportunities,
                    active: activeOpportunities,
                    won: wonOpportunities,
                    lost: lostOpportunities,
                    pipelineValue
                },
                activities: {
                    upcoming: upcomingActivities,
                    overdue: overdueActivities,
                    completed: completedActivities
                },
                summary: {
                    conversionRate: totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(2) : 0,
                    winRate: (wonOpportunities + lostOpportunities) > 0
                        ? ((wonOpportunities / (wonOpportunities + lostOpportunities)) * 100).toFixed(2)
                        : 0
                }
            };

            return makeResponse(response, 200, true, "Dashboard data retrieved", metrics);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Schedule Activity
     * Creates a new activity with smart date parsing
     */
    async scheduleActivity(request: AuthenticatedRequest, response: Response) {
        try {
            const {
                subject,
                relatedTo,
                when,
                activityType = 'CALL',
                priority = 'NORMAL',
                description
            } = request.body;

            // Parse natural language time
            const dueDate = this.parseNaturalTime(when);

            const activity = new Activity({} as Activity);
            activity.subject = subject;
            activity.activityType = activityType as any;
            activity.activityStatus = 'OPEN' as any;
            activity.activityPriority = priority as any;
            activity.dueDate = dueDate;
            activity.description = description;
            // Note: owner and organization will be set by the service layer

            // Link to related entity
            if (relatedTo) {
                switch (relatedTo.type) {
                    case 'lead':
                        const lead = await AppDataSource.getRepository(Lead)
                            .findOne({ where: { leadId: relatedTo.id } });
                        if (lead) activity.lead = lead;
                        break;
                    case 'opportunity':
                        const opp = await AppDataSource.getRepository(Oppurtunity)
                            .findOne({ where: { opportunityId: relatedTo.id } });
                        if (opp) activity.opportunity = opp;
                        break;
                    case 'account':
                        const account = await AppDataSource.getRepository(Account)
                            .findOne({ where: { accountId: relatedTo.id } });
                        if (account) activity.company = account;
                        break;
                }
            }

            const savedActivity = await AppDataSource.getRepository(Activity).save(activity);

            return makeResponse(response, 201, true, "Activity scheduled", savedActivity);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Parse natural language time expressions
     */
    private parseNaturalTime(naturalTime: string): Date {
        const now = new Date();
        const lowerTime = naturalTime.toLowerCase();

        // Handle "tomorrow"
        if (lowerTime.includes('tomorrow')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Extract time if present (e.g., "tomorrow 3pm", "tomorrow 11:30")
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

        // Handle "today"
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

        // Handle "next week", "next monday", etc.
        if (lowerTime.includes('next week')) {
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(9, 0, 0, 0);
            return nextWeek;
        }

        // Handle "in X hours/days"
        const inMatch = lowerTime.match(/in (\d+) (hour|day|minute)s?/);
        if (inMatch) {
            const amount = parseInt(inMatch[1]);
            const unit = inMatch[2];
            const future = new Date(now);

            switch (unit) {
                case 'minute':
                    future.setMinutes(future.getMinutes() + amount);
                    break;
                case 'hour':
                    future.setHours(future.getHours() + amount);
                    break;
                case 'day':
                    future.setDate(future.getDate() + amount);
                    break;
            }

            return future;
        }

        // Default: 1 hour from now
        const defaultTime = new Date(now);
        defaultTime.setHours(defaultTime.getHours() + 1);
        return defaultTime;
    }

    /**
     * Get upcoming activities
     */
    async getUpcomingActivities(request: AuthenticatedRequest, response: Response) {
        try {
            const { days = 7, limit = 20 } = request.query;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const userId = request.user?.userId;

            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + Number(days));

            const activities = await AppDataSource.getRepository(Activity)
                .createQueryBuilder('activity')
                .leftJoinAndSelect('activity.lead', 'lead')
                .leftJoinAndSelect('activity.opportunity', 'opportunity')
                .leftJoinAndSelect('activity.company', 'company')
                .leftJoinAndSelect('activity.contact', 'contact')
                .where('activity.organizationId = :orgId', { orgId })
                .andWhere('activity.ownerId = :userId', { userId })
                .andWhere('activity.activityStatus = :status', { status: 'OPEN' })
                .andWhere('activity.dueDate BETWEEN :now AND :future', { now, future: futureDate })
                .orderBy('activity.dueDate', 'ASC')
                .limit(Number(limit))
                .getMany();

            return makeResponse(response, 200, true, "Upcoming activities retrieved", activities);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Get overdue activities
     */
    async getOverdueActivities(request: AuthenticatedRequest, response: Response) {
        try {
            const { limit = 20 } = request.query;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const userId = request.user?.userId;

            const now = new Date();

            const activities = await AppDataSource.getRepository(Activity)
                .createQueryBuilder('activity')
                .leftJoinAndSelect('activity.lead', 'lead')
                .leftJoinAndSelect('activity.opportunity', 'opportunity')
                .leftJoinAndSelect('activity.company', 'company')
                .leftJoinAndSelect('activity.contact', 'contact')
                .where('activity.organizationId = :orgId', { orgId })
                .andWhere('activity.ownerId = :userId', { userId })
                .andWhere('activity.activityStatus = :status', { status: 'OPEN' })
                .andWhere('activity.dueDate < :now', { now })
                .orderBy('activity.dueDate', 'ASC')
                .limit(Number(limit))
                .getMany();

            return makeResponse(response, 200, true, "Overdue activities retrieved", activities);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Create a new lead
     */
    async createLead(request: AuthenticatedRequest, response: Response) {
        try {
            const payload = request.body;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const userId = request.user?.userId;

            // Generate lead ID
            const leadId = `LEAD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            const leadRepo = AppDataSource.getRepository(Lead);
            const userRepo = AppDataSource.getRepository(User);
            const orgRepo = AppDataSource.getRepository(Organisation);

            // Get owner
            const owner = await userRepo.findOne({ where: { userId } });
            if (!owner) {
                return makeResponse(response, 400, false, "User not found", null);
            }

            // Get organization
            const organization = await orgRepo.findOne({ where: { organisationId: orgId! } });
            if (!organization) {
                return makeResponse(response, 400, false, "Organization not found", null);
            }

            // Handle company if provided
            let company = null;
            if (payload.companyId) {
                company = await AppDataSource.getRepository(Account).findOne({
                    where: { accountId: payload.companyId }
                });
            }

            // Create lead
            const lead = new Lead({
                leadId,
                fullName: payload.fullName,
                phone: payload.phone,
                email: payload.email,
                title: payload.title || payload.fullName,
                city: payload.city || 'Pune',
                state: payload.state || 'Maharashtra',
                country: payload.country || 'India',
                leadSource: payload.leadSource || 'WhatsApp',
                rating: payload.rating || 'COLD',
                status: payload.status || 'NEW',
                loanType: payload.loanType,
                loanAmount: payload.loanAmount,
                zone: payload.zone,
                village: payload.village,
                pincode: payload.pincode,
                taluka: payload.taluka,
                description: payload.description,
                owner,
                organization,
                company
            } as any);

            const savedLead = await leadRepo.save(lead);

            return makeResponse(response, 201, true, "Lead created successfully", savedLead);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Update an existing lead
     */
    async updateLead(request: AuthenticatedRequest, response: Response) {
        try {
            const { leadId } = request.params;
            const updates = request.body;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;

            const leadRepo = AppDataSource.getRepository(Lead);

            // Find lead using query builder
            const lead = await leadRepo
                .createQueryBuilder('lead')
                .where('lead.leadId = :leadId', { leadId })
                .andWhere('lead.organizationId = :orgId', { orgId })
                .getOne();

            if (!lead) {
                return makeResponse(response, 404, false, "Lead not found", null);
            }

            // Update allowed fields
            if (updates.fullName) lead.fullName = updates.fullName;
            if (updates.phone) lead.phone = updates.phone;
            if (updates.email) lead.email = updates.email;
            if (updates.city) lead.city = updates.city;
            if (updates.state) lead.state = updates.state;
            if (updates.rating) lead.rating = updates.rating;
            if (updates.status) lead.status = updates.status;
            if (updates.loanType) lead.loanType = updates.loanType;
            if (updates.loanAmount) lead.loanAmount = updates.loanAmount;
            if (updates.zone) lead.zone = updates.zone;
            if (updates.village) lead.village = updates.village;
            if (updates.pincode) lead.pincode = updates.pincode;
            if (updates.taluka) lead.taluka = updates.taluka;
            if (updates.description) lead.description = updates.description;

            const updatedLead = await leadRepo.save(lead);

            return makeResponse(response, 200, true, "Lead updated successfully", updatedLead);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Qualify a lead into an opportunity
     */
    async qualifyLead(request: AuthenticatedRequest, response: Response) {
        try {
            const { leadId } = request.params;
            const { estimatedRevenue, estimatedCloseDate, stage } = request.body;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const userId = request.user?.userId;

            const leadRepo = AppDataSource.getRepository(Lead);
            const oppRepo = AppDataSource.getRepository(Oppurtunity);
            const userRepo = AppDataSource.getRepository(User);
            const orgRepo = AppDataSource.getRepository(Organisation);

            // Find lead using query builder
            const lead = await leadRepo
                .createQueryBuilder('lead')
                .leftJoinAndSelect('lead.company', 'company')
                .leftJoinAndSelect('lead.contact', 'contact')
                .where('lead.leadId = :leadId', { leadId })
                .andWhere('lead.organizationId = :orgId', { orgId })
                .getOne();

            if (!lead) {
                return makeResponse(response, 404, false, "Lead not found", null);
            }

            // Check if lead is already qualified
            if (lead.wasQualified) {
                return makeResponse(response, 400, false, "Lead has already been qualified to an opportunity", null);
            }

            // Double-check if opportunity already exists for this lead
            const existingOpp = await oppRepo.findOne({
                where: { Lead: { leadId } }
            });

            if (existingOpp) {
                return makeResponse(response, 400, false, "An opportunity already exists for this lead", existingOpp);
            }

            // Get owner and organization
            const owner = await userRepo.findOne({ where: { userId } });
            const organization = await orgRepo.findOne({ where: { organisationId: orgId! } });

            // Generate opportunity ID
            const opportunityId = `OPP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Create opportunity
            const opportunity = new Oppurtunity({
                opportunityId,
                title: `${lead.fullName} - ${lead.loanType || 'Loan'}`,
                estimatedRevenue: estimatedRevenue || lead.loanAmount || '0',
                estimatedCloseDate: estimatedCloseDate ? new Date(estimatedCloseDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                stage: stage || 'Document collection',
                status: 'Active',
                priority: 'Medium',
                loanType: lead.loanType,
                loanAmount: lead.loanAmount,
                company: lead.company,
                contact: lead.contact,
                owner,
                organization,
                Lead: lead
            } as any);

            const savedOpp = await oppRepo.save(opportunity);

            // Update lead status
            lead.status = statusType.QUALIFIED;
            lead.wasQualified = true;
            await leadRepo.save(lead);

            return makeResponse(response, 201, true, "Lead qualified to opportunity", savedOpp);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Update an opportunity
     */
    async updateOpportunity(request: AuthenticatedRequest, response: Response) {
        try {
            const { opportunityId } = request.params;
            const updates = request.body;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;

            const oppRepo = AppDataSource.getRepository(Oppurtunity);

            // Find opportunity using query builder
            const opp = await oppRepo
                .createQueryBuilder('opp')
                .where('opp.opportunityId = :opportunityId', { opportunityId })
                .andWhere('opp.organizationId = :orgId', { orgId })
                .getOne();

            if (!opp) {
                return makeResponse(response, 404, false, "Opportunity not found", null);
            }

            // Update allowed fields
            if (updates.stage) opp.stage = updates.stage;
            if (updates.status) opp.status = updates.status;
            if (updates.priority) opp.priority = updates.priority;
            if (updates.estimatedRevenue) opp.estimatedRevenue = updates.estimatedRevenue;
            if (updates.actualRevenue) opp.actualRevenue = updates.actualRevenue;
            if (updates.estimatedCloseDate) opp.estimatedCloseDate = new Date(updates.estimatedCloseDate);
            if (updates.actualCloseDate) opp.actualCloseDate = new Date(updates.actualCloseDate);
            if (updates.wonReason) opp.wonReason = updates.wonReason;
            if (updates.lostReason) opp.lostReason = updates.lostReason;
            if (updates.description) opp.description = updates.description;

            const updatedOpp = await oppRepo.save(opp);

            return makeResponse(response, 200, true, "Opportunity updated successfully", updatedOpp);
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Get team performance metrics (managers only)
     */
    async getTeamPerformance(request: AuthenticatedRequest, response: Response) {
        try {
            const { timeRange = 'week' } = request.query;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const currentUser = request.user;

            // Check if user has manager role
            if (!currentUser || !(currentUser.role as any)?.some((r: any) => ['ADMIN', 'MANAGER'].includes(r.name))) {
                return makeResponse(response, 403, false, "Access denied. Managers only.", null);
            }

            // Calculate date range
            const now = new Date();
            let startDate = new Date();
            switch (timeRange) {
                case 'today': startDate.setHours(0, 0, 0, 0); break;
                case 'week': startDate.setDate(now.getDate() - 7); break;
                case 'month': startDate.setMonth(now.getMonth() - 1); break;
                case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
                default: startDate.setDate(now.getDate() - 7);
            }

            const userRepo = AppDataSource.getRepository(User);
            const leadRepo = AppDataSource.getRepository(Lead);
            const oppRepo = AppDataSource.getRepository(Oppurtunity);
            const actRepo = AppDataSource.getRepository(Activity);

            // Get all active users in organization
            const users = await userRepo.find({
                where: {
                    isActive: true
                }
            });

            const teamPerformance = await Promise.all(users.map(async (user) => {
                const [leadsCreated, leadsQualified, activeOpps, wonOpps, completedActivities] = await Promise.all([
                    leadRepo.count({
                        where: {
                            ownerId: user.userId,
                            createdAt: Between(startDate, now)
                        } as any
                    }),
                    leadRepo.count({
                        where: {
                            ownerId: user.userId,
                            status: 'QUALIFIED',
                            updatedAt: Between(startDate, now)
                        } as any
                    }),
                    oppRepo.count({
                        where: {
                            ownerId: user.userId,
                            status: 'ACTIVE'
                        } as any
                    }),
                    oppRepo.count({
                        where: {
                            ownerId: user.userId,
                            status: 'WON',
                            actualCloseDate: Between(startDate, now)
                        } as any
                    }),
                    actRepo.count({
                        where: {
                            ownerId: user.userId,
                            activityStatus: 'COMPLETED',
                            updatedAt: Between(startDate, now)
                        } as any
                    })
                ]);

                return {
                    userId: user.userId,
                    userName: user.userId, // User entity doesn't have displayName
                    email: user.email,
                    roles: user.roles,
                    metrics: {
                        leadsCreated,
                        leadsQualified,
                        activeOpportunities: activeOpps,
                        wonOpportunities: wonOpps,
                        completedActivities,
                        conversionRate: leadsCreated > 0 ? ((leadsQualified / leadsCreated) * 100).toFixed(2) : 0
                    }
                };
            }));

            return makeResponse(response, 200, true, "Team performance retrieved", {
                timeRange,
                teamMembers: teamPerformance.length,
                performance: teamPerformance
            });
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Bulk assign leads or opportunities (managers only)
     */
    async bulkAssign(request: AuthenticatedRequest, response: Response) {
        try {
            const { entityType, entityIds, newOwnerId } = request.body;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const currentUser = request.user;

            // Check if user has manager role
            if (!currentUser || !(currentUser.role as any)?.some((r: any) => ['ADMIN', 'MANAGER'].includes(r.name))) {
                return makeResponse(response, 403, false, "Access denied. Managers only.", null);
            }

            // Validate inputs
            if (!entityType || !entityIds || !Array.isArray(entityIds) || !newOwnerId) {
                return makeResponse(response, 400, false, "Invalid request. Provide entityType, entityIds array, and newOwnerId.", null);
            }

            // Get new owner
            const newOwner = await AppDataSource.getRepository(User).findOne({
                where: { userId: newOwnerId, isActive: true }
            });

            if (!newOwner) {
                return makeResponse(response, 404, false, "New owner not found or inactive", null);
            }

            let updated = 0;

            if (entityType === 'lead') {
                const leadRepo = AppDataSource.getRepository(Lead);
                for (const leadId of entityIds) {
                    const lead = await leadRepo.findOne({
                        where: { leadId, }
                    });
                    if (lead) {
                        lead.owner = newOwner;
                        await leadRepo.save(lead);
                        updated++;
                    }
                }
            } else if (entityType === 'opportunity') {
                const oppRepo = AppDataSource.getRepository(Oppurtunity);
                for (const oppId of entityIds) {
                    const opp = await oppRepo.findOne({
                        where: { opportunityId: oppId, }
                    });
                    if (opp) {
                        opp.owner = newOwner;
                        await oppRepo.save(opp);
                        updated++;
                    }
                }
            } else {
                return makeResponse(response, 400, false, "Invalid entityType. Use 'lead' or 'opportunity'.", null);
            }

            return makeResponse(response, 200, true, `Successfully reassigned ${updated} ${entityType}(s)`, {
                assigned: updated,
                newOwner: {
                    userId: newOwner.userId,
                    name: newOwner.userId
                }
            });
        } catch (error) {
            return errorHandler(response, error);
        }
    }

    /**
     * Send notification to users
     */
    async sendNotification(request: AuthenticatedRequest, response: Response) {
        try {
            const { recipientIds, message, priority = 'NORMAL' } = request.body;
            const orgId = request.apiKey?.organisationId || request.user?.organizationId;
            const senderId = request.user?.userId;

            // Validate inputs
            if (!recipientIds || !Array.isArray(recipientIds) || !message) {
                return makeResponse(response, 400, false, "Provide recipientIds array and message", null);
            }

            // This is a placeholder implementation
            // In a real system, you'd integrate with a notification service
            const notifications = recipientIds.map(recipientId => ({
                notificationId: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                recipientId,
                senderId,
                message,
                priority,
                status: 'SENT',
                createdAt: new Date()
            }));

            // TODO: Integrate with actual notification service (email, SMS, push)
            console.log('[Notifications]', notifications);

            return makeResponse(response, 200, true, `Notifications sent to ${recipientIds.length} user(s)`, {
                sent: recipientIds.length,
                notifications
            });
        } catch (error) {
            return errorHandler(response, error);
        }
    }
}

export default UnifiedController;
