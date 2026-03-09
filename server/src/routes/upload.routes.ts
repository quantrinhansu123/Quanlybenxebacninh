import { Router } from 'express';
import { uploadImage, checkStorageHealth } from '../controllers/upload.controller.js';
import { upload } from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Health check endpoint (no auth required for monitoring)
router.get('/health', checkStorageHealth);

// Protect upload route
router.use(authenticate);

// 'image' is the field name in the form-data
router.post('/', upload.single('image'), uploadImage);

export default router;
