import { Request, Response } from "express";
import { makeResponse } from "../common/utils";
import CronService from "../services/cron.service";

const cronService = new CronService();
class CronController {
  async getExpiringSubscriptionsAndSendReminders(_req: Request, res: Response) {
    await cronService.getExpiringSubscriptionsAndSendReminders();
    return makeResponse(
      res,
      200,
      true,
      "Expring Subscriptions Cron job executed successfully",
      null
    );
  }

  async updateSubscriptionStatusAndSendReminders(_: Request, res: Response) {
    await cronService.updateSubscriptionStatusAndSendReminders();
    return makeResponse(
      res,
      200,
      true,
      "Update Subscription Status Cron job executed successfully",
      null
    );
  }

  async sendMonthlyReportToSuperAdmin(_: Request, res: Response) {
    await cronService.sendMonthlyReportToSuperAdmin();
    return makeResponse(
      res,
      200,
      true,
      "Send Monthly Report Cron job executed successfully",
      null
    );
  }

  async checkActivityCronJob(_: Request, res: Response) {
    await cronService.checkActivityCronJob();
    return makeResponse(
      res,
      200,
      true,
      "Check Activity Cron job executed successfully",
      null
    );
  }

  async markUpcomingToActive(_: Request, res: Response) {
    await cronService.markUpcomingToActive();
    return makeResponse(
      res,
      200,
      true,
      "Mark Upcoming To Active Cron job executed successfully",
      null
    );
  }

}

export default CronController;
