import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { Request } from 'express';
import { s3Client, S3_BUCKET_NAME } from '../config/s3';
import { AuthRequest } from './auth';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 5;

/**
 * Multer upload middleware using multer-s3 storage.
 * Files are uploaded to S3 under the key: products/{storeId}/{timestamp}-{sanitized-originalname}
 * The resulting file URL is available on req.file.location after upload.
 */
export const uploadProductImage = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req: Request, file: Express.Multer.File, cb: (error: any, metadata?: any) => void) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req: Request, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
      const authReq = req as AuthRequest;
      const storeId = authReq.user?.storeId || 'unknown';
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
      const key = `products/${storeId}/${timestamp}-${safeName}${ext}`;
      cb(null, key);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // 5MB in bytes
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. Solo se aceptan: JPEG, PNG, WebP, GIF.`));
    }
  },
});
