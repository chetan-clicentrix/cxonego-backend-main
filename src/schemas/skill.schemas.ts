import { z } from "zod";
import { DefaultSearchParams } from "./comman.schemas";

export const proficiencyLevelEnum = z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]);

export const AddSkillSchema = z.object({
    name: z.string().min(1, "Skill name is required"),
    category: z.string().optional().nullable(),
    proficiencyLevel: proficiencyLevelEnum.optional().default("Beginner"),
    yearsOfExperience: z.number().optional().default(0),
    isCertified: z.boolean().optional().default(false),
    certificationName: z.string().optional().nullable(),
    lastUsedDate: z.string().optional().nullable(), // Will be converted to Date in service
});

export const UpdateSkillSchema = z.object({
    name: z.string().optional(),
    category: z.string().optional().nullable(),
    proficiencyLevel: proficiencyLevelEnum.optional(),
    yearsOfExperience: z.number().optional(),
    isCertified: z.boolean().optional(),
    certificationName: z.string().optional().nullable(),
    lastUsedDate: z.string().optional().nullable(),
});

export const SkillSearchSchema = DefaultSearchParams.extend({
    search: z.string().optional(),
    name: z.string().optional(),
    category: z.string().optional(),
    proficiencyLevel: proficiencyLevelEnum.optional(),
});

export const BulkDeleteSkillSchema = z.object({
    skillIds: z.array(z.string()),
});

export type AddSkillSchemaType = z.infer<typeof AddSkillSchema>;
export type UpdateSkillSchemaType = z.infer<typeof UpdateSkillSchema>;
export type SkillSearchSchemaType = z.infer<typeof SkillSearchSchema>;
export type BulkDeleteSkillSchemaType = z.infer<typeof BulkDeleteSkillSchema>;
