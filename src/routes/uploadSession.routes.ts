import { Router } from "express";
import {
    createUploadSession,
    getUploadSessionDetails,
    getOpportunitySessions,
    createRequirement,
    getOpportunityRequirements,
    updateRequirement,
    deleteRequirement,
} from "../controllers/uploadSession.controller";
import hasPermission from "../middlewares/permission.middleware";
import { roleNames } from "../common/utils";

const router = Router();

/**
 * Admin upload session routes (authentication required)
 */

// Apply authentication middleware to all routes
router.use(hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]));

// Session management
router.post("/", createUploadSession);
router.get("/:uploadSessionId", getUploadSessionDetails);
router.get("/opportunity/:opportunityId", getOpportunitySessions);

// Requirement management
router.post("/:uploadSessionId/requirement", createRequirement);
router.get("/opportunity/:opportunityId/requirements", getOpportunityRequirements);
router.put("/requirement/:requirementId", updateRequirement);
router.delete("/requirement/:requirementId", deleteRequirement);

export default router;
