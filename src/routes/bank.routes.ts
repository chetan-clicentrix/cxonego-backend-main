import { Router } from "express";
import BankController from "../controllers/bank.controller";
import hasPermission from "../middlewares/permission.middleware";
import { roleNames } from "../common/utils";

import { bodySchemaValidator } from "../middlewares/schema.validator";
import { BankSchema } from "../schemas/bank.schemas";

const bankRouter = Router();
const bankController = new BankController();

bankRouter.get(
    "/",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER, roleNames.SALESPERSON]),
    bankController.getAllBanks
);

bankRouter.post(
    "/create-bank",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(BankSchema),
    bankController.createBank
);

bankRouter.put(
    "/update-bank/:bankId",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]),
    bodySchemaValidator(BankSchema),
    bankController.updateBank
);

bankRouter.get(
    "/get-bank/:bankId",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER, roleNames.SALESPERSON]),
    bankController.getBank
);

bankRouter.delete(
    "/delete-bank/:bankId",
    hasPermission([roleNames.ADMIN]),
    bankController.deleteBank
);

export default bankRouter;
