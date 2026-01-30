import * as express from "express";
import { ActivityPlanController } from "../controllers/activityPlan.controller";
import { authMiddleware } from "../middlewares/firebase.middleware";

const router = express.Router();
const activityPlanController = new ActivityPlanController();

router.post(
    "/create-default",
    authMiddleware(),
    activityPlanController.createDefaultPlan
);

router.get(
    "/opportunity/:opportunityId",
    authMiddleware(),
    activityPlanController.getPlansByOpportunity
);

router.put(
    "/action/:actionId/status",
    authMiddleware(),
    activityPlanController.updateActionStatus
);

router.post(
    "/apply-template",
    authMiddleware(),
    activityPlanController.applyTemplate
);

router.post(
    "/plan/:planId/action",
    authMiddleware(),
    activityPlanController.createAction
);

router.put(
    "/action/:actionId",
    authMiddleware(),
    activityPlanController.updateAction
);

router.delete(
    "/action/:actionId",
    authMiddleware(),
    activityPlanController.deleteAction
);

export default router;
