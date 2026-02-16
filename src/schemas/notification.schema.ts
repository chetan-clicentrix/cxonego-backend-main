import { z } from "zod";

export const createNotificationSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    title: z.string().min(1, "Title is required").max(255, "Title too long"),
    message: z.string().min(1, "Message is required"),
    type: z.enum(["lead", "opportunity", "activity", "contact", "account", "system"]),
    entityId: z.string().optional(),
    entityType: z.string().max(100).optional(),
    actionUrl: z.string().max(500).optional(),
    icon: z.string().max(100).optional(),
    metadata: z.record(z.any()).optional(),
    expiresAt: z.string().datetime().optional(),
});

export const updateNotificationSchema = z.object({
    isRead: z.boolean().optional(),
});

export const notificationFilterSchema = z.object({
    type: z.enum(["lead", "opportunity", "activity", "contact", "account", "system"]).optional(),
    isRead: z.enum(["true", "false"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
});

export const bulkNotificationSchema = z.object({
    userIds: z.array(z.string().uuid()).min(1, "At least one user ID required"),
    title: z.string().min(1, "Title is required").max(255, "Title too long"),
    message: z.string().min(1, "Message is required"),
    type: z.enum(["lead", "opportunity", "activity", "contact", "account", "system"]),
    entityId: z.string().optional(),
    entityType: z.string().max(100).optional(),
    actionUrl: z.string().max(500).optional(),
    icon: z.string().max(100).optional(),
    metadata: z.record(z.any()).optional(),
    expiresAt: z.string().datetime().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationFilterInput = z.infer<typeof notificationFilterSchema>;
export type BulkNotificationInput = z.infer<typeof bulkNotificationSchema>;
