import { z } from "zod";
import { ApplicantType } from "../common/utils";

export const BankSchema = z.object({
    name: z.string().min(1, "Name is required"),
    code: z.string().nullable().optional(),
});

export const BankDocumentConfigSchema = z.object({
    bank: z.object({
        bankId: z.string()
    }),
    applicantType: z.nativeEnum(ApplicantType),
    requiredDocuments: z.array(z.string()).min(1, "At least one document is required")
});

export const CloneConfigSchema = z.object({
    sourceBankId: z.string(),
    sourceApplicantType: z.nativeEnum(ApplicantType),
    targetBankId: z.string(),
    targetApplicantType: z.nativeEnum(ApplicantType)
});

export const BulkCloneConfigSchema = z.object({
    sourceBankId: z.string(),
    targetBankId: z.string(),
    applicantTypes: z.array(z.nativeEnum(ApplicantType)).min(1)
});

export const UpdateDocumentsSchema = z.object({
    documents: z.array(z.string()).min(1, "At least one document is required")
});

export type BankSchemaType = z.infer<typeof BankSchema>;
export type BankDocumentConfigSchemaType = z.infer<typeof BankDocumentConfigSchema>;
export type CloneConfigSchemaType = z.infer<typeof CloneConfigSchema>;
export type BulkCloneConfigSchemaType = z.infer<typeof BulkCloneConfigSchema>;
export type UpdateDocumentsSchemaType = z.infer<typeof UpdateDocumentsSchema>;
