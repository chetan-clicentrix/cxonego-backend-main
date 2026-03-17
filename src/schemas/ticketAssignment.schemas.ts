import { z } from "zod";

export const TicketAssignmentSchema = z.object({
    caseId: z.string().min(1, "Case ID is required"),
    technicianId: z.string().min(1, "Technician ID is required"),
    assignmentNotes: z.string().nullable().optional(),
});

export const RejectAssignmentSchema = z.object({
    rejectionReason: z.string().min(1, "Rejection reason is required"),
});

export const CompleteAssignmentSchema = z.object({
    notes: z.string().nullable().optional(),
});

export type TicketAssignmentSchemaType = z.infer<
    typeof TicketAssignmentSchema
>;
export type RejectAssignmentSchemaType = z.infer<
    typeof RejectAssignmentSchema
>;
export type CompleteAssignmentSchemaType = z.infer<
    typeof CompleteAssignmentSchema
>;
