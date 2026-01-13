import { string, z } from "zod";
import { SocialMedia } from "../entity/SocialMedia";
import { profileSchema } from "./user.schemas";


export const companySchema = z.object({
    name: z.string(),
    country: z.string(),
    state: z.string(),
    city: z.string()
});


export const socialMediaSchema = z.object({
    name: z.string(),
    url: z.string()
});
export const createAccountSchema = z.object({
    accountName: z.string(),
    industry: z.string(),
    country: z.string(),
    state: z.string(),
    city: z.string(),
    description: z.string().nullable().optional(),
    socialMedia: z.array(socialMediaSchema).nullable().optional(),
    employeeSize: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    businessType: z.string().nullable().optional(),
    CurrencyCode: z.string().nullable().optional(),
    annualRevenue: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    area: z.string().nullable().optional(),
    clientCategory: z.string().nullable().optional(),
    segment: z.string().nullable().optional(),
})
export const accountSchema = z.object({
    accountName: z.string(),
    industry: z.string(),
    country: z.string(),
    state: z.string(),
    city: z.string(),
    description: z.string().nullable().optional(),
    socialMedia: z.array(socialMediaSchema).nullable().optional(),
    status: z.enum(["Active", "Inactive"]).nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    countryCode: z.string().nullable().optional(),
    employeeSize: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    businessType: z.string().nullable().optional(),
    CurrencyCode: z.string().nullable().optional(),
    annualRevenue: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    area: z.string().nullable().optional(),
    clientCategory: z.string().nullable().optional(),
    segment: z.string().nullable().optional(),
    // user:profileSchema
})
export const partiallyAccountSchema = z.object({
    accountName: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    AddressLine1: z.string().nullable().optional(),
    Area: z.string().nullable().optional(),
    employeeSize: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    businessType: z.enum(["Analyst", "Competitor", "Investor", "Partner", "Customer", "Integrator", "Reseller", "Prospect", "Other"]).optional(),
    currencyCode: z.enum(["INR", "GBP", "USD", "EUR", "AUD"]).optional(),
    annualRevenue: z.string().nullable().optional(),
    clientCategory: z.string().nullable().optional(),
    segment: z.string().nullable().optional(),
})
export const deleteByIdSchema = z.object({
    accountIds: z.array(z.string())
})
export type partiallyAccountSchemaType = z.infer<typeof partiallyAccountSchema>;
export type accountSchemaType = z.infer<typeof accountSchema>;
export type companySchemaType = z.infer<typeof companySchema>;
export type createAccountSchemaType = z.infer<typeof createAccountSchema>;