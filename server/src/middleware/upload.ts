import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import { Request } from 'express'

// Use memory storage for cloud uploads (Supabase Storage)
// This avoids issues with missing 'uploads/' directory on cloud deployments
const storage = multer.memoryStorage()

// File filter
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const filetypes = /jpeg|jpg|png|gif|webp/
  const mimetype = filetypes.test(file.mimetype)
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

  if (mimetype && extname) {
    return cb(null, true)
  }
  cb(new Error('Only image files are allowed!'))
}

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
})
