import { Router } from "express";
import ApiKeyController from "../controllers/apiKey.controller";
import { authMiddleware } from "../middlewares/firebase.middleware";

const router = Router();
const apiKeyController = new ApiKeyController();

// All routes require Firebase authentication (admin users only)
router.use(authMiddleware());

// Create a new API key
router.post("/", apiKeyController.createApiKey.bind(apiKeyController));

// List all API keys for the organization
router.get("/", apiKeyController.listApiKeys.bind(apiKeyController));

// Revoke an API key
router.delete(
    "/:apiKeyId/revoke",
    apiKeyController.revokeApiKey.bind(apiKeyController)
);

// Delete an API key permanently
router.delete("/:apiKeyId", apiKeyController.deleteApiKey.bind(apiKeyController));

export default router;
