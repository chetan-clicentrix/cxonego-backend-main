import { Router } from "express";
import CaseController from "../controllers/case.controller";
import { bodySchemaValidator } from "../middlewares/schema.validator";
import {
    CaseSchema,
    UpdateCaseSchema,
    CaseSchemaPartial,
    AssignTechnicianSchema,
    UpdateCaseStatusSchema,
} from "../schemas/case.schemas";

const caseRouter = Router();
const caseController = new CaseController();

// Get all cases
caseRouter.get("/", caseController.getAllCases);

// Get cases with filters (POST for complex filtering)
caseRouter.post("/filter", caseController.getCases);

// Create new case
caseRouter.post(
    "/",
    bodySchemaValidator(CaseSchema),
    caseController.createCase
);

// Get single case
caseRouter.get("/:caseId", caseController.getCase);

// Update case
caseRouter.put(
    "/:caseId",
    bodySchemaValidator(UpdateCaseSchema),
    caseController.updateCase
);

// Partially update case
caseRouter.patch(
    "/:caseId",
    bodySchemaValidator(CaseSchemaPartial),
    caseController.partiallyUpdateCase
);

// Delete case
caseRouter.delete("/:caseId", caseController.deleteCase);

// Bulk delete cases
caseRouter.post("/bulk-delete", caseController.bulkDeleteCase);

// Assign technician to case
caseRouter.post(
    "/:caseId/assign",
    bodySchemaValidator(AssignTechnicianSchema),
    caseController.assignTechnician
);

// Update case status
caseRouter.patch(
    "/:caseId/status",
    bodySchemaValidator(UpdateCaseStatusSchema),
    caseController.updateCaseStatus
);

// Get cases by customer
caseRouter.get("/customer/:customerId", caseController.getCasesByCustomer);

// Get cases by technician
caseRouter.get(
    "/technician/:technicianId",
    caseController.getCasesByTechnician
);

// Get case status history
caseRouter.get("/:caseId/history", caseController.getCaseHistory);

export default caseRouter;
