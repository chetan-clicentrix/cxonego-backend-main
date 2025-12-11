import { z } from "zod";

export const TechnicianSchema = z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(1, "Phone number is required"),
    countryCode: z.string().nullable().optional(),
    specialization: z.array(z.string()).nullable().optional(),
    experienceYears: z.number().int().min(0).default(0).optional(),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().default("India").optional(),
    userId: z.string().nullable().optional(),
});

export const UpdateTechnicianSchema = z.object({
    employeeId: z.string().min(1).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
    countryCode: z.string().nullable().optional(),
    specialization: z.array(z.string()).nullable().optional(),
    experienceYears: z.number().int().min(0).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).optional(),
    availability: z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]).optional(),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    country: z.string().optional(),
});

export const TechnicianSchemaPartial = TechnicianSchema.partial();

export const UpdateAvailabilitySchema = z.object({
    availability: z.enum(["AVAILABLE", "BUSY", "OFF_DUTY"]),
});

export type TechnicianSchemaType = z.infer<typeof TechnicianSchema>;
export type UpdateTechnicianSchemaType = z.infer<typeof UpdateTechnicianSchema>;
export type TechnicianSchemaPartialType = z.infer<
    typeof TechnicianSchemaPartial
>;
export type UpdateAvailabilitySchemaType = z.infer<
    typeof UpdateAvailabilitySchema
>;
