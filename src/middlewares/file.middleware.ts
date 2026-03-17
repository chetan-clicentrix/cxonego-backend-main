import * as multer from 'multer';
import { MulterError } from 'multer';
import { Request } from 'express';
// 8 * 1024 * 1024 calculates to 8 MB.
const setupMemoryStorageUpload = () => {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 8 * 1024 * 1024 },
    }).single('file');
    return (req: any, res: any, next: any) => {
        upload(req, res, (err: any) => {
            if (err instanceof MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File size exceeds the limit.' });
                }
                return res.status(400).json({ error: err.message });
            } else if (err) {
                return res.status(500).json({ error: err });
            }
            next();
        });
    };
};
const uploadFileUsingMulter = setupMemoryStorageUpload();
export { uploadFileUsingMulter };
