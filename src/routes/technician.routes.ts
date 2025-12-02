import { Router } from "express";
import TechnicianController from "../controllers/technician.controller";
import { bodySchemaValidator } from "../middlewares/schema.validator";
import {
    TechnicianSchema,
    UpdateTechnicianSchema,
    TechnicianSchemaPartial,
    UpdateAvailabilitySchema,
} from "../schemas/technician.schemas";

const technicianRouter = Router();
const technicianController = new TechnicianController();

// Get all technicians
technicianRouter.get("/", technicianController.getAllTechnicians);

// Get technicians with filters (POST for complex filtering)
technicianRouter.post("/filter", technicianController.getTechnicians);

// Create new technician
technicianRouter.post(
    "/",
    bodySchemaValidator(TechnicianSchema),
    technicianController.createTechnician
);

// Get single technician
technicianRouter.get("/:technicianId", technicianController.getTechnician);

// Update technician
technicianRouter.put(
    "/:technicianId",
    bodySchemaValidator(UpdateTechnicianSchema),
    technicianController.updateTechnician
);

// Partially update technician
technicianRouter.patch(
    "/:technicianId",
    bodySchemaValidator(TechnicianSchemaPartial),
    technicianController.partiallyUpdateTechnician
);

// Delete technician
technicianRouter.delete("/:technicianId", technicianController.deleteTechnician);

// Update technician availability
technicianRouter.patch(
    "/:technicianId/availability",
    bodySchemaValidator(UpdateAvailabilitySchema),
    technicianController.updateAvailability
);

// Get technician workload
technicianRouter.get(
    "/:technicianId/workload",
    technicianController.getTechnicianWorkload
);

// Get available technicians
technicianRouter.get(
    "/available/list",
    technicianController.getAvailableTechnicians
);

// Get technicians by specialization
technicianRouter.post(
    "/specialization/filter",
    technicianController.getTechniciansBySpecialization
);

export default technicianRouter;
