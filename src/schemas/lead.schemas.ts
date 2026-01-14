import { z } from "zod";

export const LeadSchema = z.object({
    fullName: z.string(),
    countryCode: z.string().nullable().optional(),
    phone: z.string().optional(),
    title: z.string(),
    email: z.string().email().nullable().optional(),
    company: z.string().nullable().optional(),
    country: z.string(),
    state: z.string(),
    city: z.string(),
    price: z.string().nullable().optional(),
    leadSource: z.string(),
    status: z.enum(["New", "In Progress", "Qualified", "Closed"] as const).nullable().optional(),
    rating: z.enum(["Hot", "Warm", "Cold"] as const).nullable().optional(),
    // owner:z.object({}).optional(),
    fullname: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    loanType: z.string(),
    loanAmount: z.string()
});

export const BulkLeadSchema = z.object({
    fullName: z.string(),
    countryCode: z.string().nullable().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    email: z.string().email().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    price: z.string().optional(),
    leadSource: z.string(),
    status: z.enum(["New", "In Progress", "Qualified", "Closed"] as const).optional(),
    rating: z.enum(["Hot", "Warm", "Cold"] as const).optional(),
    owner: z.string().optional(),
    fullname: z.string().optional(),
    mobile: z.string().optional()
});

export const bulkDeleteSchema = z.object({
    leadIds: z.array(z.string())
})
export const bulkCreate = z.object({
    leads: z.array(LeadSchema)
})
export const LeadSearchSchema = z.object({
    search: z.string().optional(),
    user: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
})

export const LeadSchemaWithpagination = z.object({
    total: z.number(),
    page: z.number(),
    lastPage: z.number(),
    data: LeadSchema.array()

})
export const LeadSchemaTypePath = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    countryCode: z.string().nullable().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    email: z.string().email().optional(),
    leadId: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    deletedAt: z.boolean().optional(),
    company: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    price: z.string().optional(),
    leadSource: z.string(),
    status: z.enum(["New", "In Progress", "Qualified", "Won", "Lost", "Closed"] as const).optional(),
    rating: z.enum(["Hot", "Warm", "Cold"] as const).optional(),
    owner: z.string().optional(),
    modifiedBy: z.string().optional(),
    fullname: z.string().optional(),
    mobile: z.string().optional(),
    loanType: z.string().optional(),
    loanAmount: z.string().optional()
})
export type bulkDeleteSchemaType = z.infer<typeof bulkDeleteSchema>;
export type bulkCreateType = z.infer<typeof bulkCreate>;
export type LeadSchemaType = z.infer<typeof LeadSchema>;
export type LeadSearchSchemaType = z.infer<typeof LeadSearchSchema>;
export type LeadSchemaWithpaginationType = z.infer<typeof LeadSchemaWithpagination>;