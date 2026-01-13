import * as multer from "multer";
import * as path from "path";
import * as fs from "fs";

const uploadDir = process.env.TEMP_UPLOAD_DIR || "C:/tmp/uploads";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

console.log("Upload directory configured:", uploadDir);

// Configure Multer with diskStorage for streaming
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        console.log("Multer destination callback - uploadDir:", uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, _file, cb) => {
        const { uploadId, chunkIndex } = req.body;

        console.log("Multer filename callback - uploadId:", uploadId, "chunkIndex:", chunkIndex);

        // If uploadId/chunkIndex not available yet (multer processes file before body),
        // use a temporary name and rename later in controller
        if (!uploadId || chunkIndex === undefined) {
            const tempName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log("Using temp filename:", tempName);
            return cb(null, tempName);
        }

        // Save chunk with unique name
        const chunkFileName = `${uploadId}_chunk_${chunkIndex}`;
        console.log("Using chunk filename:", chunkFileName);
        cb(null, chunkFileName);
    },
});

// Chunk upload middleware (5MB max per chunk)
export const chunkUpload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.UPLOAD_CHUNK_SIZE || "5242880"), // 5MB default
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
