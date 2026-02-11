import { string, z } from "zod";
import { DefaultSearchParams } from "./comman.schemas";
import { roleSchema } from "./role.schemas";
// import { DefaultSearchParams } from "./common";

export const AddUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email({ message: "Invalid email address" }),
});

export const SearchUser = DefaultSearchParams.extend({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const UpdateUser = z.object({
  firstName: z.string(),
  lastName: z.string(),
});

export const profileSchema = z.object({
  userId: z.string(),
  email: z.string().email().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  countryCode: z.string().nullable().optional(),
  phone: z.string().optional().nullable(),
  primaryIntension: z.string().nullable().optional(),
  fcmWebToken: z.string().optional().nullable(),
  fcmAndroidToken: z.string().optional().nullable(),
});

export const resetPasswordSchema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
});

export const addRoleToUserSchema = z.object({
  userId: z.string(),
  role: z.array(z.enum(["ADMIN", "SALESMANAGER", "SALESPERSON"])),
});

export const deleteRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "SALESMANAGER", "SALESPERSON"]),
});

export const inviteUserSchema = z.object({
  invites: z.array(
    z.object({
      email: z.string().email(),
      company: z.string(),
      role: z.enum(["ADMIN", "SALESMANAGER", "SALESPERSON"]),
      organizationId: z.string(),
    })
  ),
  hostUserId: z.string(),
});

export const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "SALESMANAGER", "SALESPERSON"]),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  countryCode: z.string(),
  phone: z.string(),
  currency: z.string(),
});

export const isIinvitationRevokedSchema = z.object({
  organizationId: z.string(),
  userEmail: z.string(),
});

export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
export type profileSchemaType = z.infer<typeof profileSchema>;
export type UserSchema = z.infer<typeof AddUser>;
export type UpdateUserSchema = z.infer<typeof UpdateUser>;
export type SearchUserSchema = z.infer<typeof SearchUser>;
export type UpdateUserRoleSchemaType = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserProfileSchemaType = z.infer<
  typeof updateUserProfileSchema
>;
export type IsIinvitationRevokedSchemaType = z.infer<
  typeof isIinvitationRevokedSchema
>;
