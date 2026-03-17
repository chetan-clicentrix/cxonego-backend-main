import { Response } from "express";
import { notificationService } from "../services/notification.service";
import {
    createNotificationSchema,
    notificationFilterSchema,
    bulkNotificationSchema,
} from "../schemas/notification.schema";
import { CustomRequest } from "../interfaces/types";

export class NotificationController {
    /**
     * Get notifications for the authenticated user
     * GET /api/notifications
     */
    async getNotifications(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            // Validate query parameters
            const validatedQuery = notificationFilterSchema.parse(req.query);

            const filters: any = {};
            if (validatedQuery.type) filters.type = validatedQuery.type;
            if (validatedQuery.isRead !== undefined) {
                filters.isRead = validatedQuery.isRead === "true";
            }
            if (validatedQuery.startDate) {
                filters.startDate = new Date(validatedQuery.startDate);
            }
            if (validatedQuery.endDate) {
                filters.endDate = new Date(validatedQuery.endDate);
            }

            const pagination = {
                page: parseInt(validatedQuery.page || "1"),
                limit: parseInt(validatedQuery.limit || "20"),
            };

            const result = await notificationService.getNotificationsByUserId(
                userId,
                filters,
                pagination
            );

            res.status(200).json(result);
        } catch (error: any) {
            console.error("Error fetching notifications:", error);
            res.status(500).json({ error: error.message || "Failed to fetch notifications" });
        }
    }

    /**
     * Get unread notification count
     * GET /api/notifications/unread-count
     */
    async getUnreadCount(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            // [NEW] Check for overdue activity plan actions before calculating unread count
            // This ensures notifications trigger automatically when the bell polls (every 10s)
            try {
                const { ActivityPlanService } = await import("../services/activityPlan.service");
                const activityPlanService = new ActivityPlanService();
                await activityPlanService.checkAllOverdueActionsForUser(userId);
            } catch (err) {
                console.error("Error checking overdue actions during poll:", err);
            }

            const count = await notificationService.getUnreadCount(userId);
            res.status(200).json({ count });
        } catch (error: any) {
            console.error("Error fetching unread count:", error);
            res.status(500).json({ error: error.message || "Failed to fetch unread count" });
        }
    }

    /**
     * Create a new notification (admin/system only)
     * POST /api/notifications
     */
    async createNotification(req: CustomRequest, res: Response) {
        try {
            const validatedData = createNotificationSchema.parse(req.body);

            const notification = await notificationService.createNotification({
                ...validatedData,
                expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
            });

            res.status(201).json(notification);
        } catch (error: any) {
            console.error("Error creating notification:", error);
            if (error.name === "ZodError") {
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            res.status(500).json({ error: error.message || "Failed to create notification" });
        }
    }

    /**
     * Create bulk notifications
     * POST /api/notifications/bulk
     */
    async createBulkNotifications(req: CustomRequest, res: Response) {
        try {
            const validatedData = bulkNotificationSchema.parse(req.body);

            const { userIds, ...notificationData } = validatedData;

            const notifications = await notificationService.createBulkNotifications(
                userIds,
                {
                    ...notificationData,
                    expiresAt: notificationData.expiresAt
                        ? new Date(notificationData.expiresAt)
                        : undefined,
                }
            );

            res.status(201).json({
                message: `Created ${notifications.length} notifications`,
                notifications,
            });
        } catch (error: any) {
            console.error("Error creating bulk notifications:", error);
            if (error.name === "ZodError") {
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            res.status(500).json({ error: error.message || "Failed to create bulk notifications" });
        }
    }

    /**
     * Mark a notification as read
     * PATCH /api/notifications/:id/read
     */
    async markAsRead(req: CustomRequest, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const notification = await notificationService.markAsRead(id, userId);
            res.status(200).json(notification);
        } catch (error: any) {
            console.error("Error marking notification as read:", error);
            if (error.message === "Notification not found") {
                return res.status(404).json({ error: "Notification not found" });
            }
            res.status(500).json({ error: error.message || "Failed to mark notification as read" });
        }
    }

    /**
     * Mark all notifications as read
     * PATCH /api/notifications/mark-all-read
     */
    async markAllAsRead(req: CustomRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            await notificationService.markAllAsRead(userId);
            res.status(200).json({ message: "All notifications marked as read" });
        } catch (error: any) {
            console.error("Error marking all notifications as read:", error);
            res.status(500).json({ error: error.message || "Failed to mark all notifications as read" });
        }
    }

    /**
     * Delete a notification
     * DELETE /api/notifications/:id
     */
    async deleteNotification(req: CustomRequest, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            await notificationService.deleteNotification(id, userId);
            res.status(200).json({ message: "Notification deleted successfully" });
        } catch (error: any) {
            console.error("Error deleting notification:", error);
            if (error.message === "Notification not found") {
                return res.status(404).json({ error: "Notification not found" });
            }
            res.status(500).json({ error: error.message || "Failed to delete notification" });
        }
    }
}

export const notificationController = new NotificationController();
