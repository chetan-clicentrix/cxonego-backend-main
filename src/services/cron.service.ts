import {
  checkActivityCronJob,
} from "../common/cron";
import { decrypt, roleNames, subscriptionStatus } from "../common/utils";
import { AppDataSource } from "../data-source";
import { Subscription } from "../entity/Subscription";
import { User } from "../entity/User";
import { EmailNotificationService } from "./emailNotification.service";
import { EmailType } from "../entity/SentEmailLog";
import SubscriptionService from "./subscription.service";

class CronService {
  private _subscriptionService = new SubscriptionService();

  async getExpiringSubscriptionsAndSendReminders() {
    await this._subscriptionService.getExpiringSubscriptionsAndSendReminders();
    return;
  }

  async updateSubscriptionStatusAndSendReminders() {
    await this._subscriptionService.updateSubscriptionStatusAndSendReminders();
    return;
  }

  async sendMonthlyReportToSuperAdmin() {
    await this._subscriptionService.sendMonthlyReportToSuperAdmin();
    return;
  }

  async checkActivityCronJob() {
    await checkActivityCronJob();
    // await sendActivityNotifications();
    return;
  }

  async sendActivityReminderEmail(ownerUser: {
    username: string;
    email: string;
    orgId: string;
    role: string;
    subject: string;
    description: string;
    datetime: string
  }) {
    const subject = `Reminder for your upcoming activity on CX-One-Go`;

    const html = `
    <head>
    <title>CxOnego</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #f0ad4e; color: #fff; padding: 10px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1>Activity Reminder</h1>
      </div>
      <div style="padding: 20px;">
      <strong>Dear ${ownerUser.username}</strong>,
      <br/><br/>
      We hope this message finds you well. This is a gentle reminder regarding your scheduled activity.
      <br/><br/>
      <strong>Activity Details:</strong>
      <br/><br/>
      <strong>Subject:</strong> ${ownerUser.subject}<br/><br/>
      <strong>Due Date:</strong> ${ownerUser.datetime}<br/><br/>
      <strong>Description:</strong> ${ownerUser.description}<br/><br/>
      <br/><br/>
      Best regards,<br/><br/>
      CX-One-Go Team
      </div>
    </div>
  </body>
  
  `;

    const emailService = new EmailNotificationService();
    if (ownerUser.role === roleNames.ADMIN) {
      try {
        const result = await emailService.sendEmail({
          to: ownerUser.email,
          subject: subject,
          bodyHtml: html,
          emailType: EmailType.CUSTOM,
          organizationId: ownerUser.orgId
        });
        console.log(`✓ Activity reminder queued for admin: ${result.jobId}`);
      } catch (error: any) {
        console.error(`Failed to queue activity reminder for ${ownerUser.email}:`, error.message);
      }
    } else {
      //find admin
      const userRepository = AppDataSource.getRepository(User);
      const admin = await userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.organisation", "organisation")
        .leftJoinAndSelect("user.roles", "role")
        .where("organisation.organisationId = :orgId", {
          orgId: ownerUser.orgId,
        })
        .andWhere("role.roleName = :roleName", { roleName: roleNames.ADMIN })
        .getOne();

      if (admin) {
        const adminEmail = decrypt(admin.email);

        try {
          const result = await emailService.sendEmail({
            to: ownerUser.email,
            cc: [adminEmail],
            subject: subject,
            bodyHtml: html,
            emailType: EmailType.CUSTOM,
            organizationId: ownerUser.orgId
          });
          console.log(`✓ Activity reminder queued with CC to admin: ${result.jobId}`);
        } catch (error: any) {
          console.error(`Failed to queue activity reminder for ${ownerUser.email}:`, error.message);
        }
      }
    }
  }

  async markUpcomingToActive() {
    const subscriptionRepository = AppDataSource.getRepository(Subscription);

    const subscriptions = await subscriptionRepository.find({
      where: { subscription_status: subscriptionStatus.SUBSCRIPTION_UPCOMING },
    });

    for (const subscription of subscriptions) {
      if (subscription.subscription_status === subscriptionStatus.SUBSCRIPTION_UPCOMING) {
        subscription.subscription_status = subscriptionStatus.SUBSCRIPTION_ACTIVE;
        await subscriptionRepository.save(subscription);
      }
    }
  }

}

export default CronService;
