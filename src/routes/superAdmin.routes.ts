import { Router } from "express";
import SuperAdminController from "../controllers/superAdmin.controller";
import { bodySchemaValidator } from "../middlewares/schema.validator";
import {
  DeleteUserScehma,
  SuperAdminSchema,
} from "../schemas/superAdmin.schemas";

const superAdminRouter = Router();
const superAdminController = new SuperAdminController();

superAdminRouter.post(
  "/login",
  bodySchemaValidator(SuperAdminSchema),
  superAdminController.login
);

superAdminRouter.post("/disableUser", superAdminController.disableUser);

superAdminRouter.post(
  "/deleteUser",
  bodySchemaValidator(DeleteUserScehma),
  superAdminController.deleteUserFromInvitedList
);

superAdminRouter.post(
  "/",
  bodySchemaValidator(SuperAdminSchema),
  superAdminController.createSuperAdmin
);

superAdminRouter.post(
  "/:id",
  bodySchemaValidator(SuperAdminSchema),
  superAdminController.updateSuperAdmin
);

superAdminRouter.delete("/:id", superAdminController.deleteSuperAdmin);

export default superAdminRouter;
