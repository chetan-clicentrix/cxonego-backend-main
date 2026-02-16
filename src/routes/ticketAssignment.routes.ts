import { Router } from "express";
import TicketAssignmentController from "../controllers/ticketAssignment.controller";
import { bodySchemaValidator } from "../middlewares/schema.validator";
import {
    TicketAssignmentSchema,
    RejectAssignmentSchema,
    CompleteAssignmentSchema,
} from "../schemas/ticketAssignment.schemas";

const assignmentRouter = Router();
const assignmentController = new TicketAssignmentController();

// Get assignments with filters
assignmentRouter.post("/filter", assignmentController.getAssignments);

// Create new assignment
assignmentRouter.post(
    "/",
    bodySchemaValidator(TicketAssignmentSchema),
    assignmentController.createAssignment
);

// Get single assignment
assignmentRouter.get("/:assignmentId", assignmentController.getAssignment);

// Accept assignment
assignmentRouter.patch(
    "/:assignmentId/accept",
    assignmentController.acceptAssignment
);

// Reject assignment
assignmentRouter.patch(
    "/:assignmentId/reject",
    bodySchemaValidator(RejectAssignmentSchema),
    assignmentController.rejectAssignment
);

// Start assignment
assignmentRouter.patch(
    "/:assignmentId/start",
    assignmentController.startAssignment
);

// Complete assignment
assignmentRouter.patch(
    "/:assignmentId/complete",
    bodySchemaValidator(CompleteAssignmentSchema),
    assignmentController.completeAssignment
);

// Get assignments by case
assignmentRouter.get("/case/:caseId", assignmentController.getAssignmentsByCase);

// Get assignments by technician
assignmentRouter.post(
    "/technician/:technicianId",
    assignmentController.getAssignmentsByTechnician
);

// Get pending assignments for technician
assignmentRouter.get(
    "/pending/:technicianId",
    assignmentController.getPendingAssignments
);

export default assignmentRouter;
