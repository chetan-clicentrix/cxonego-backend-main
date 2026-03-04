import { Router } from "express";
import { roleNames } from "../common/utils";
import { OppurtunityController } from "../controllers/oppurtunity.controller";
import hasPermission from "../middlewares/permission.middleware";
import { bodySchemaValidator } from "../middlewares/schema.validator";
import { bulkDeleteOpportunitySchema, OpportunitySchema } from "../schemas/oppurtunity.schemas";

const oppurtunityRouter = Router();
const oppurtunityController = new OppurtunityController();

oppurtunityRouter.get("/", oppurtunityController.getAllOppurtunities);

oppurtunityRouter.post(
    "/getAllopportunity",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER, roleNames.SALESPERSON]),
    oppurtunityController.getAllOppurtunity
);

oppurtunityRouter.post(
    "/create-opportunity",
    bodySchemaValidator(OpportunitySchema),
    oppurtunityController.createOppurtunity
);

oppurtunityRouter.put(
    "/:opportunityId",
    hasPermission([roleNames.ADMIN, roleNames.SALESPERSON, roleNames.SALESMANAGER]),
    bodySchemaValidator(OpportunitySchema),
    oppurtunityController.updateOppurtunity
);

oppurtunityRouter.delete(
    "/:opportunityId",
    hasPermission([roleNames.ADMIN]),
    oppurtunityController.deleteOppurtunity
);
oppurtunityRouter.get(
    "/:opportunityId",
    hasPermission([roleNames.SALESPERSON, roleNames.ADMIN, roleNames.SALESMANAGER]),
    oppurtunityController.getOppurtunityById
)

oppurtunityRouter.post(
    "/bulk-delete",
    hasPermission([roleNames.ADMIN]),
    bodySchemaValidator(bulkDeleteOpportunitySchema),
    oppurtunityController.bulkDeleteOpportunity
)

//related view get all opportunity by accountId
oppurtunityRouter.post(
    "/getAllopportunity/byaccount/:accountID",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER, roleNames.SALESPERSON]),
    oppurtunityController.getAllOppurtunityByAccountId
);

//related view get all opportunity by contactId
oppurtunityRouter.post(
    "/getAllopportunity/bycontact/:contactID",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER, roleNames.SALESPERSON]),
    oppurtunityController.getAllOppurtunityByContactId
);

// export opportunities to excel
oppurtunityRouter.post(
    "/getAllopportunity/export-excel",
    hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER, roleNames.SALESPERSON]),
    oppurtunityController.exportOpportunitiesToExcel
);

export default oppurtunityRouter;