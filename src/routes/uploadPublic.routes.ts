import { Router } from "express";
import {
    getUploadSession,
    initializeUpload,
    uploadChunk,
    getUploadProgress,
    getUploadedChunks,
} from "../controllers/uploadPublic.controller";
import { chunkUpload } from "../middleware/upload.middleware";

const router = Router();

/**
 * Public upload routes (no authentication required)
 * Accessed via session token
 */

// Get session details and requirements
router.get("/:sessionToken", getUploadSession);

// Initialize upload
router.post("/:sessionToken/init", initializeUpload);

// Upload chunk (with Multer middleware)
console.log("Setting up chunk upload route");
router.post("/:sessionToken/chunk", (req, res, next) => {
    console.log("Chunk upload route HIT! Session:", req.params.sessionToken);
    next();
}, chunkUpload.single("file"), uploadChunk);

// Get upload progress
router.get("/:sessionToken/progress/:uploadId", getUploadProgress);

// Get uploaded chunks (for resume)
router.get("/:sessionToken/chunks/:uploadId", getUploadedChunks);

export default router;
