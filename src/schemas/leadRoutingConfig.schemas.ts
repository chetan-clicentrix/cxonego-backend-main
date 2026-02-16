import { z } from "zod";
import { routingOperator, routingAssignToType, routingAttribute } from "../common/utils";

export const LeadRoutingConfigSchema = z.object({
    attribute: z.nativeEnum(routingAttribute),
    operator: z.nativeEnum(routingOperator),
    value: z.string().min(1, "Value is required"),
    assignToType: z.nativeEnum(routingAssignToType),
    assignToId: z.string().min(1, "Invalid User or Role ID"),
    priority: z.number().int().min(0),
});

export const LeadRoutingConfigSearchSchema = z.object({
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
});

export const LeadRoutingConfigWithPagination = z.object({
    total: z.number(),
    page: z.number(),
    lastPage: z.number(),
    data: LeadRoutingConfigSchema.array()
});

export const LeadRoutingConfigUpdateSchema = z.object({
    id: z.string().uuid().optional(),
    attribute: z.nativeEnum(routingAttribute).optional(),
    operator: z.nativeEnum(routingOperator).optional(),
    value: z.string().min(1).optional(),
    assignToType: z.nativeEnum(routingAssignToType).optional(),
    assignToId: z.string().optional(),
    priority: z.number().int().min(0).optional(),
    organizationId: z.string().optional(), // Standardized to 'z'
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    deletedAt: z.boolean().optional(),
});

export type LeadRoutingConfigType = z.infer<typeof LeadRoutingConfigSchema>;
export type LeadRoutingConfigSearchSchemaType = z.infer<typeof LeadRoutingConfigSearchSchema>;
export type LeadRoutingConfigWithPaginationType = z.infer<typeof LeadRoutingConfigWithPagination>;
export type LeadRoutingConfigUpdateType = z.infer<typeof LeadRoutingConfigUpdateSchema>;
