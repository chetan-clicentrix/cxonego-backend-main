import { z } from "zod";


export const ContactSchema = z.object({
    fullName: z.string(),
    // countryCode :z.string().regex(new RegExp("^[+][0-9]{1,5}$"), "Invalid country code format should be like +countryCode").nullable().optional(),    
    countryCode: z.string().nullable().optional(),
    phone: z.string(),
    email: z.string().email().nullable().optional(),
    addressLine: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    status: z.enum(["Active", "Inactive"]).nullable().optional(),
    area: z.string().nullable().optional(),
    favourite: z.enum(["Yes", "No"]).nullable().optional(),
    industry: z.string().nullable().optional(),
    designation: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    social: z.string().nullable().optional(),
    timeline: z.string().nullable().optional(),
    contactType: z.enum(["Prospect", "Customer", "Partner", "Investor", "Professional", "Busineess Owner", "Owner", "Personal", "Other"]).nullable().optional()
});



export const ContactSchemaPartial = ContactSchema.partial();

export type ContactSchemaPartialType = z.infer<typeof ContactSchemaPartial>;
export type ContactSchemaType = z.infer<typeof ContactSchema>;

