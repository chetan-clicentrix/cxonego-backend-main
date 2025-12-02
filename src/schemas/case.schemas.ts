import { z } from "zod";

export const CaseSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    category: z.enum([
        "Electronics",
        "Appliances",
        "Plumbing",
        "Electrical",
        "HVAC",
        "Carpentry",
        "Other",
    ]),
    priority: z
        .enum(["Low", "Medium", "High", "Critical"])
        .default("Medium")
        .optional(),
    productName: z.string().min(1, "Product name is required"),
    productModel: z.string().nullable().optional(),
    warrantyStatus: z
        .enum(["In Warranty", "Out of Warranty", "Extended Warranty"])
        .default("Out of Warranty")
        .optional(),
    issueReportedDate: z.string().or(z.date()),
    scheduledDate: z.string().or(z.date()).nullable().optional(),
    customerId: z.string().min(1, "Customer ID is required"),
    accountId: z.string().nullable().optional(),
});

export const UpdateCaseSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    category: z
        .enum([
            "Electronics",
            "Appliances",
            "Plumbing",
            "Electrical",
            "HVAC",
            "Carpentry",
            "Other",
        ])
        .optional(),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
    status: z
        .enum([
            "New",
            "Assigned",
            "In Progress",
            "On Hold",
            "Resolved",
            "Closed",
            "Cancelled",
        ])
        .optional(),
    productName: z.string().min(1).optional(),
    productModel: z.string().nullable().optional(),
    warrantyStatus: z
        .enum(["In Warranty", "Out of Warranty", "Extended Warranty"])
        .optional(),
    scheduledDate: z.string().or(z.date()).nullable().optional(),
    completedDate: z.string().or(z.date()).nullable().optional(),
    resolutionNotes: z.string().nullable().optional(),
});

export const CaseSchemaPartial = CaseSchema.partial();

export const AssignTechnicianSchema = z.object({
    technicianId: z.string().min(1, "Technician ID is required"),
    assignmentNotes: z.string().nullable().optional(),
});

export const UpdateCaseStatusSchema = z.object({
    status: z.enum([
        "New",
        "Assigned",
        "In Progress",
        "On Hold",
        "Resolved",
        "Closed",
        "Cancelled",
    ]),
    reason: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

export type CaseSchemaType = z.infer<typeof CaseSchema>;
export type UpdateCaseSchemaType = z.infer<typeof UpdateCaseSchema>;
export type CaseSchemaPartialType = z.infer<typeof CaseSchemaPartial>;
export type AssignTechnicianSchemaType = z.infer<typeof AssignTechnicianSchema>;
export type UpdateCaseStatusSchemaType = z.infer<typeof UpdateCaseStatusSchema>;
