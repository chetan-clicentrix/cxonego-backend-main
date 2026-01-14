import { Router } from "express";
import BankDocumentConfigController from "../controllers/bankDocumentConfig.controller";
import hasPermission from "../middlewares/permission.middleware";
import { roleNames } from "../common/utils";

import { bodySchemaValidator } from "../middlewares/schema.validator";
import { BankDocumentConfigSchema, CloneConfigSchema, BulkCloneConfigSchema, UpdateDocumentsSchema } from "../schemas/bank.schemas";

const bankDocConfigRouter = Router();
const bankDocConfigController = new BankDocumentConfigController();

bankDocConfigRouter.get(
    "/",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bankDocConfigController.getAllConfigs
);

bankDocConfigRouter.post(
    "/create-config",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(BankDocumentConfigSchema),
    bankDocConfigController.createConfig
);

bankDocConfigRouter.get(
    "/get-config/:configId",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bankDocConfigController.getConfig
);

bankDocConfigRouter.put(
    "/update-config/:configId",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(BankDocumentConfigSchema),
    bankDocConfigController.updateConfig
);

bankDocConfigRouter.delete(
    "/delete-config/:configId",
    hasPermission([roleNames.ADMIN]),
    bankDocConfigController.deleteConfig
);

bankDocConfigRouter.get(
    "/get-documents",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER, roleNames.SALESPERSON]),
    bankDocConfigController.getDocuments
);

bankDocConfigRouter.get(
    "/get-configs-by-bank/:bankId",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bankDocConfigController.getConfigsByBank
);

bankDocConfigRouter.post(
    "/clone-config",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(CloneConfigSchema),
    bankDocConfigController.cloneConfig
);

bankDocConfigRouter.post(
    "/bulk-clone-configs",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(BulkCloneConfigSchema),
    bankDocConfigController.bulkClone
);

bankDocConfigRouter.patch(
    "/add-documents/:configId",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(UpdateDocumentsSchema),
    bankDocConfigController.addDocuments
);

bankDocConfigRouter.patch(
    "/remove-documents/:configId",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(UpdateDocumentsSchema),
    bankDocConfigController.removeDocuments
);

export default bankDocConfigRouter;
