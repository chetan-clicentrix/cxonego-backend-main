import { Router } from "express";
import SkillController from "../controllers/skill.controller";
import { roleNames } from "../common/utils";
import hasPermission from "../middlewares/permission.middleware";

const skillRouter = Router();
const skillController = new SkillController();

skillRouter.get("/", skillController.getAllSkills);
skillRouter.get("/:skillId", skillController.getSkillById);
skillRouter.post("/", skillController.createSkill);
skillRouter.put("/:skillId", skillController.updateSkill);
skillRouter.delete("/:skillId", skillController.deleteSkill);
skillRouter.post("/bulk-delete", hasPermission([roleNames.ADMIN]), skillController.bulkDeleteSkills);

export default skillRouter;
