import * as multer from "multer";
import * as path from "path";
import * as fs from "fs";

const uploadDir = process.env.TEMP_UPLOAD_DIR || "C:/tmp/uploads";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer with diskStorage for streaming
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, _file, cb) => {
        const { uploadId, chunkIndex } = req.body;

        // If uploadId/chunkIndex not available yet (multer processes file before body),
        // use a temporary name and rename later in controller
        if (!uploadId || chunkIndex === undefined) {
            const tempName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            return cb(null, tempName);
        }

        // Save chunk with unique name
        const chunkFileName = `${uploadId}_chunk_${chunkIndex}`;
        cb(null, chunkFileName);
    },
});

// Chunk upload middleware
export const chunkUpload = multer({
    storage,
    limits: {
        // Add 10% overhead for multipart/form-data boundaries and headers
        fileSize: Math.floor(parseInt(process.env.UPLOAD_CHUNK_SIZE || "5242880") * 1.1),
        fieldSize: 10 * 1024 * 1024, // 10MB for field data
    },
    fileFilter: (_req, _file, cb) => {
        // Basic validation - detailed validation in controller
        cb(null, true);
    },
});

// File type validation helper
export function validateFileType(
    fileName: string,
    allowedTypes: string[]
): boolean {
    const ext = path.extname(fileName).toLowerCase().replace(".", "");
    return allowedTypes.includes(ext);
}

// File size validation helper
export function validateFileSize(
    fileSize: number,
    maxSize: number
): boolean {
    return fileSize <= maxSize;
}
