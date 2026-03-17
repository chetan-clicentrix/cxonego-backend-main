import * as express from "express";
import { ActivityPlanTemplateController } from "../controllers/activityPlanTemplate.controller";
import { authMiddleware } from "../middlewares/firebase.middleware";

const router = express.Router();
const controller = new ActivityPlanTemplateController();

router.post("/", authMiddleware(), controller.createTemplate);
router.get("/", authMiddleware(), controller.getAllTemplates);
router.get("/default", authMiddleware(), controller.getDefaultTemplate);
router.get("/:templateId", authMiddleware(), controller.getTemplateById);
router.put("/:templateId", authMiddleware(), controller.updateTemplate);
router.delete("/:templateId", authMiddleware(), controller.deleteTemplate);
router.post("/:templateId/set-default", authMiddleware(), controller.setDefaultTemplate);
router.post("/:templateId/clone-actions", authMiddleware(), controller.cloneActions);

export default router;
