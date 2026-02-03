import { Response } from "express";
import DashboardServices from "../services/dashboard.service";
import { makeResponse } from "../common/utils";
import { errorHandler } from "../common/errors";
import { AuthenticatedRequest } from "../interfaces/types";
import { DateRangeParamsType, RangeDateType, RevenueRangeParamsType } from "../schemas/comman.schemas";
import { Role } from "../entity/Role";
const dashboardServices = new DashboardServices();

class DashboardController {


    async getAllLeadStatusCounts(_request: AuthenticatedRequest, response: Response) {
        try {
            const countsObjcet = await dashboardServices.getAllLeadStatusCounts();
            if (!countsObjcet) {
                return makeResponse(response, 200, false, "All Lead Counts Data Not Found", null);
            }
            return makeResponse(response, 200, true, "All Lead Counts Data are Found", countsObjcet);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async getAllLeadStatusPercentage(_request: AuthenticatedRequest, response: Response) {
        try {
            const percentageObjcet = await dashboardServices.getAllLeadStatusPercentage();
            if (!percentageObjcet) {
                return makeResponse(response, 200, false, "All Lead Percentage Data Not Found", null);
            }
            return makeResponse(response, 200, true, "All Lead Percentage Data are Found", percentageObjcet);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async qualifiedLeadRate(_request: AuthenticatedRequest, response: Response) {
        try {
            const percentageObjcet = await dashboardServices.qualifiedLeadRate();
            if (!percentageObjcet) {
                return makeResponse(response, 200, false, "Qualified Lead Rate Not Found", null);
            }
            return makeResponse(response, 200, true, "Qualified Lead Rate Found", percentageObjcet);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async getAvgAndEstPrice(_request: AuthenticatedRequest, response: Response) {
        try {
            const avgAndEstPrice = await dashboardServices.getAvgAndEstPrice();
            if (!avgAndEstPrice) {
                return makeResponse(response, 200, false, "Lead average and estimated price not found", null);
            }
            return makeResponse(response, 200, true, "Lead average and estimated price found", avgAndEstPrice);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async getLeadsData(request: AuthenticatedRequest, response: Response) {
        try {
            const type: string = request.body.type;
            const date: string = request.body.date;
            const leads = await dashboardServices.getLeadsData(type, date);
            if (!leads) {
                return makeResponse(response, 200, false, "Leads data not found", null);
            }
            return makeResponse(response, 200, true, "Leads data found", leads);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async getLeadsDashboardData(request: AuthenticatedRequest, response: Response) {
        try {
            const country: string[] = request.body.country as string[];
            const state: string = request.body.state as string;
            const city: string = request.body.city as string;
            const source: string[] = request.body.leadSource as string[];
            const salesPerson: string = request.body.salesPerson as string;
            const revenueRange: RevenueRangeParamsType = request.body.estimatedRevenue;
            let dateRange: RangeDateType = request.body.dateRange as RangeDateType;

            let page: number | undefined = Number(request.query.page) || undefined;
            let limit: number | undefined = Number(request.query.limit) || undefined;
            let search: string | undefined = request.query.search as string || undefined;
            let status: string | undefined = request.query.status as string || undefined;
            let groupBy: string | undefined = request.body.groupBy as string || undefined;
            const ownerId: string = request.user.userId;
            const role: Role[] = request.user.role;
            const organizationId: string | null = request.user.organizationId;

            const leads = await dashboardServices.getLeadsDashboardData(ownerId, role,
                country, state, city, source, salesPerson, revenueRange, dateRange, page,
                limit, search, status, organizationId, groupBy);
            if (!leads) {
                return makeResponse(response, 200, false, "Leads data not found", null);
            }
            return makeResponse(response, 200, true, "Leads data found", leads);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }


    async getOpportunityDashboardData(request: AuthenticatedRequest, response: Response) {
        try {
            const currency: string = request.query.currency as string;
            const source: string[] = request.body.leadSource as string[];
            const salesPerson: string = request.body.salesPerson as string;
            let dateRange: RangeDateType = request.body.dateRange as RangeDateType;
            const revenueRange: RevenueRangeParamsType = request.body.estimatedRevenue;
            let page: number | undefined = Number(request.query.page) || undefined;
            let limit: number | undefined = Number(request.query.limit) || undefined;
            const search = request.query.search as string;
            const stage = request.query.stage as string;//at a time one for table section filter            
            const organizationId: string | null = request.user.organizationId;
            const ownerId: string = request.user.userId;
            const role: Role[] = request.user.role;
            const wonReason: string[] = request.body.wonReason as string[];
            const lostReason: string[] = request.body.lostReason as string[];
            let groupBy: string | undefined = request.body.groupBy as string || undefined;

            const opportunities = await dashboardServices.getOpportunityDashboardData(ownerId, role,
                currency, source, salesPerson, dateRange, page, limit, search, stage,
                revenueRange, wonReason, lostReason, organizationId, groupBy);
            if (!opportunities) {
                return makeResponse(response, 200, false, "Opportunity data not found", null);
            }
            return makeResponse(response, 200, true, "Opportunity data found", opportunities);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }

    async getActivityDashboardData(request: AuthenticatedRequest, response: Response) {
        try {
            const activityStatus: string[] = request.body.activityStatus as string[];
            const activityPriority: string[] = request.body.activityPriority as string[];
            const activityType: string[] = request.body.activityType as string[];

            let dateRange: RangeDateType = request.body.dateRange as RangeDateType;
            let page: number | undefined = Number(request.query.page) || undefined;
            let limit: number | undefined = Number(request.query.limit) || undefined;
            const search = request.query.search as string;
            const ownerId: string = request.user.userId;
            const role: Role[] = request.user.role;
            const organizationId: string | null = request.user.organizationId;

            const activities = await dashboardServices.getActivityDashboardData(ownerId, role,
                activityStatus, activityPriority, activityType, dateRange, page, limit, search, organizationId);

            if (!activities) {
                return makeResponse(response, 200, false, "Activities data not found", null);
            }
            return makeResponse(response, 200, true, "Activities data found", activities);
        } catch (error) {
            return errorHandler(response, error.message);
        }
    }
}
export default DashboardController;