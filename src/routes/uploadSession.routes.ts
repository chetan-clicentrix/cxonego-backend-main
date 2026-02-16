import { Router } from "express";
import {
    createUploadSession,
    getUploadSessionDetails,
    getOpportunitySessions,
    createRequirement,
    getOpportunityRequirements,
    updateRequirement,
    deleteRequirement,
    getOpportunityUploads,
    deleteUploadSession,
} from "../controllers/uploadSession.controller";
import hasPermission from "../middlewares/permission.middleware";
import { roleNames } from "../common/utils";

const router = Router();



// Apply authentication middleware to all routes
router.use(hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]));

// Session management
router.post("/", createUploadSession);
router.get("/:uploadSessionId", getUploadSessionDetails);
router.get("/opportunity/:opportunityId", getOpportunitySessions);
router.delete("/:uploadSessionId", deleteUploadSession);

// Requirement management
router.post("/:uploadSessionId/requirement", createRequirement);
router.get("/opportunity/:opportunityId/requirements", getOpportunityRequirements);
router.put("/requirement/:requirementId", updateRequirement);
router.delete("/requirement/:requirementId", deleteRequirement);

// Document uploads
router.get("/uploads/:opportunityId", getOpportunityUploads);

export default router;
