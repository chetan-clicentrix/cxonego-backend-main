import { AppDataSource } from "../data-source";
import { Notification } from "../entity/Notification";
import { User } from "../entity/User";
import { sendNotificationtoCustomer } from "./firebaseNotification.service";
import { Between, LessThan } from "typeorm";
import { v4 as uuidv4 } from "uuid";

interface CreateNotificationData {
    userId: string;
    title: string;
    message: string;
    type: string;
    entityId?: string;
    entityType?: string;
    actionUrl?: string;
    icon?: string;
    metadata?: any;
    expiresAt?: Date;
}

interface NotificationFilters {
    type?: string;
    isRead?: boolean;
    startDate?: Date;
    endDate?: Date;
}

interface PaginationParams {
    page: number;
    limit: number;
}

class NotificationService {
    private notificationRepository = AppDataSource.getRepository(Notification);
    private userRepository = AppDataSource.getRepository(User);

    async createNotification(data: CreateNotificationData): Promise<Notification> {
        const notification = this.notificationRepository.create({
            ...data,
            notificationId: uuidv4(),
        });
        const saved = await this.notificationRepository.save(notification);

        // Send push notification via Firebase
        await this.sendPushNotification(data.userId, saved);

        return saved;
    }

    async getNotificationsByUserId(
        userId: string,
        filters?: NotificationFilters,
        pagination?: PaginationParams
    ) {
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { userId };

        if (filters?.type) where.type = filters.type;
        if (filters?.isRead !== undefined) where.isRead = filters.isRead;
        if (filters?.startDate && filters?.endDate) {
            where.createdAt = Between(filters.startDate, filters.endDate);
        }

        const [notifications, total] = await this.notificationRepository.findAndCount({
            where,
            order: { createdAt: "DESC" },
            skip,
            take: limit,
        });

        return {
            notifications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getUnreadCount(userId: string): Promise<number> {
        return await this.notificationRepository.count({
            where: { userId, isRead: false },
        });
    }

    async markAsRead(notificationId: string, userId: string): Promise<Notification> {
        const notification = await this.notificationRepository.findOne({
            where: { notificationId, userId },
        });

        if (!notification) {
            throw new Error("Notification not found");
        }

        notification.isRead = true;
        return await this.notificationRepository.save(notification);
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationRepository.update(
            { userId, isRead: false },
            { isRead: true }
        );
    }

    async deleteNotification(notificationId: string, userId: string): Promise<void> {
        const result = await this.notificationRepository.delete({
            notificationId,
            userId,
        });

        if (result.affected === 0) {
            throw new Error("Notification not found");
        }
    }

    async deleteOldNotifications(daysOld: number = 90): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        await this.notificationRepository.delete({
            createdAt: LessThan(cutoffDate),
        });
    }

    private async sendPushNotification(
        userId: string,
        notification: Notification
    ): Promise<void> {
        try {
            const user = await this.userRepository.findOne({
                where: { userId },
            });

            // Try web token first, then Android token
            const fcmToken = user?.fcmWebToken || user?.fcmAndroidToken;

            if (!fcmToken) {
                console.log(`No FCM token found for user ${userId}`);
                return;
            }

            await sendNotificationtoCustomer(
                notification.title,
                notification.message,
                fcmToken
            );

            console.log(`Push notification sent to user ${userId}`);
        } catch (error) {
            console.error("Error sending push notification:", error);
            // Don't throw error - notification is still created in DB
        }
    }

    // Helper method to create notifications for multiple users
    async createBulkNotifications(
        userIds: string[],
        notificationData: Omit<CreateNotificationData, "userId">
    ): Promise<Notification[]> {
        const notifications = userIds.map((userId) =>
            this.notificationRepository.create({
                ...notificationData,
                userId,
                notificationId: uuidv4(),
            })
        );

        const saved = await this.notificationRepository.save(notifications);

        // Send push notifications in parallel
        await Promise.allSettled(
            saved.map((notification) =>
                this.sendPushNotification(notification.userId, notification)
            )
        );

        return saved;
    }
}

export const notificationService = new NotificationService();
