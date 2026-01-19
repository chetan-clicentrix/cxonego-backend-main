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
router.post("/:sessionToken/chunk",
    chunkUpload.single("file"),
    (err: any, _req: any, res: any, next: any) => {
        // Multer error handler
        if (err) {
            console.error("❌ Multer error:", err);
            return res.status(400).json({
                success: false,
                error: err.message || "File upload failed",
                code: err.code
            });
        }
        next();
    },
    uploadChunk
);

// Get upload progress
router.get("/:sessionToken/progress/:uploadId", getUploadProgress);

// Get uploaded chunks (for resume)
router.get("/:sessionToken/chunks/:uploadId", getUploadedChunks);

export default router;
