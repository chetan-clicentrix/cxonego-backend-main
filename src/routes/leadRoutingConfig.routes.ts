import { Router } from "express";
import LeadRoutingController from "../controllers/leadRoutingConfig.controller"; // Updated to default import
import { LeadRoutingConfigSchema, LeadRoutingConfigUpdateSchema } from "../schemas/leadRoutingConfig.schemas";
import { bodySchemaValidator } from "../middlewares/schema.validator";
import hasPermission from "../middlewares/permission.middleware";
import { roleNames } from "../common/utils";

const leadRoutingConfigRouter = Router();
const controller = new LeadRoutingController(); // Updated class name

leadRoutingConfigRouter.get(
    "/",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    controller.getAllConfigs
);

leadRoutingConfigRouter.post(
    "/create-config",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(LeadRoutingConfigSchema),
    controller.createConfig
);


leadRoutingConfigRouter.put(
    "/update-config/:id",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(LeadRoutingConfigUpdateSchema),
    controller.updateConfig
);

leadRoutingConfigRouter.get(
    "/get-config/:id",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    controller.getConfig
);

leadRoutingConfigRouter.patch(
    "/partial-update-config/:id",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(LeadRoutingConfigUpdateSchema),
    controller.updateConfig
);

leadRoutingConfigRouter.delete(
    "/delete-config/:id",
    hasPermission([roleNames.ADMIN]),
    controller.deleteConfig
);

export default leadRoutingConfigRouter;
