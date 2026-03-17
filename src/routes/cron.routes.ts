import { Router } from "express";
import CronController from "../controllers/cron.controller";

const cronController = new CronController();

const cronRouter = Router();

cronRouter.get(
  "/expiryReminder",
  cronController.getExpiringSubscriptionsAndSendReminders
);

cronRouter.get(
  "/updateSubscriptionStatus",
  cronController.updateSubscriptionStatusAndSendReminders
);

cronRouter.get(
  "/sendMonthlyReport",
  cronController.sendMonthlyReportToSuperAdmin
);

cronRouter.get("/markUpcomingToActive", cronController.markUpcomingToActive);

cronRouter.get("/checkActivity", cronController.checkActivityCronJob);

export default cronRouter;
