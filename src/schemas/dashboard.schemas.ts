import { z } from "zod";
import { LeadSchema } from "./lead.schemas";
import { OpportunitySchemaWithDate } from "./oppurtunity.schemas";
import { activitySchema } from "./activity.schemas";

const statusdata = z.object({
    status: z.string(),
    percentage: z.string()
});

const stagedata = z.object({
    stage: z.string(),
    percentage: z.string()
});

const categorycountdata = z.object({
    status: z.string(),
    count: z.number(),
    revenue: z.number().optional()
});

const categoryStageOpportunityData = z.object({
    stage: z.string(),
    count: z.number(),
    revenue: z.number().optional()
});

export const finalLeadObject = z.object({
    total_no_of_leads: z.number(),
    lead_percentage_status: z.array(statusdata),
    lead_count_status: z.array(categorycountdata),
    leads_with_status_new: z.number().int().optional(),
    lead_qualific_rate: z.number().optional(),
    revenue: z.number().optional(),
    avg_lead_size: z.number().optional(),
    lead_data: z.array(LeadSchema)
});

const LeadDataSchema = z.object({
    total: z.number(),
    page: z.number().optional(),
    limit: z.number().optional(),
    data: z.array(LeadSchema),
});

export const finalLeadPaginationObject = z.object({
    total_no_of_leads: z.number(),
    lead_percentage_status: z.array(statusdata),
    lead_count_status: z.array(categorycountdata),
    leads_with_status_new: z.number().int().optional(),
    lead_qualific_rate: z.number().optional(),
    revenue: z.number().optional(),
    avg_lead_size: z.number().optional(),
    lead_data: LeadDataSchema
});


//opportunity objects
export const finalOpportunityObject = z.object({
    opportunity_percentage_stage: z.array(stagedata),
    opportunity_count_stage: z.array(categoryStageOpportunityData),
    total_opportunity_count: z.number().optional(),
    total_closed_opportunity_count: z.number().optional(),
    avg_opportunity_size: z.number().optional(),
    est_opportunity_revenue: z.number().optional(),
    opportunity_data: z.array(OpportunitySchemaWithDate)
});

const OpportunityDataSchema = z.object({
    total: z.number(),
    page: z.number().optional(),
    limit: z.number().optional(),
    data: z.array(OpportunitySchemaWithDate),
});

export const finalOpportunityPaginationObject = z.object({
    opportunity_percentage_stage: z.array(stagedata),
    opportunity_count_stage: z.array(categoryStageOpportunityData),
    opportunity_est_revenue_monthwise: z.record(z.number()),
    total_opportunity_count: z.number().optional(),
    total_closed_opportunity_count: z.number().optional(),
    avg_opportunity_size: z.number().optional(),
    est_opportunity_revenue: z.number().optional(),
    opportunity_data: OpportunityDataSchema
});

const activity_status_count_data = z.object({
    activityStatus: z.string(),
    count: z.string()
});

const activity_status_percentage_data = z.object({
    activityStatus: z.string(),
    percentage: z.string()
});

const activity_type_count_data = z.object({
    activityType: z.string(),
    count: z.string()
});

const activity_type_percentage_data = z.object({
    activityType: z.string(),
    percentage: z.string()
});

export type finalLeadObjectSchemaType = z.infer<typeof finalLeadObject>;
export type finalLeadPaginationObjectSchemaType = z.infer<typeof finalLeadPaginationObject>;
export type statusdataType = z.infer<typeof statusdata>;
export type categorycountdataType = z.infer<typeof categorycountdata>;
export type stagedataType = z.infer<typeof stagedata>;
export type categoryStageOpportunityDataType = z.infer<typeof categoryStageOpportunityData>;
export type finalOpportunityObjectSchemaType = z.infer<typeof finalOpportunityObject>;
export type finalOpportunityPaginationObjectSchemaType = z.infer<typeof finalOpportunityPaginationObject>;
export type activity_status_count_dataType = z.infer<typeof activity_status_count_data>;
export type activity_status_percentage_dataType = z.infer<typeof activity_status_percentage_data>;
export type activity_type_count_dataType = z.infer<typeof activity_type_count_data>;
export type activity_type_percentage_dataType = z.infer<typeof activity_type_percentage_data>;

