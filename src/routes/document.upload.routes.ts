import { Router } from "express";
import { getDocuments, deleteDocument, bulkDeleteDocuments } from "../controllers/document.upload.controller";
import hasPermission from "../middlewares/permission.middleware";
import { roleNames } from "../common/utils";

const router = Router();

/**
 * Document upload routes
 * Base path: /api/v1/documents
 */

// Apply authentication middleware
router.use(hasPermission([roleNames.ADMIN, roleNames.SALESMANAGER]));

// Get all documents for an opportunity
router.get("/", getDocuments);

// Bulk delete documents
router.post("/bulk-delete", bulkDeleteDocuments);

// Delete a single document
router.delete("/:uploadId", deleteDocument);

export default router;
