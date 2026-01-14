import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use absolute path from project root
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});

const upload = multer({ storage });

import sharp from 'sharp';

router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // Resize if width/height provided
        if (req.query.width || req.query.height) {
            const width = req.query.width ? parseInt(req.query.width) : null;
            const height = req.query.height ? parseInt(req.query.height) : null;
            const originalPath = req.file.path;
            const tempPath = `${originalPath}.tmp`;

            await sharp(originalPath)
                .resize({
                    width: width,
                    height: height,
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toFile(tempPath);

            fs.unlinkSync(originalPath);
            fs.renameSync(tempPath, originalPath);
        }

        // Construct URL dynamically based on request host
        const protocol = req.protocol;
        const host = req.get('host');
        const url = `${protocol}://${host}/uploads/${req.file.filename}`;
        res.json({ publicUrl: url });

    } catch (error) {
        console.error('Resize error:', error);
        // Even if resize fails, we might want to return the original or error out. 
        // Let's return error but keep file for now? No, better error out.
        return res.status(500).json({ error: 'Image processing failed' });
    }
});

export default router;
