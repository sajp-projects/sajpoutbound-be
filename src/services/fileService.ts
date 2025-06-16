import dotenv from 'dotenv';
import { Request } from 'express';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Convert callback-based fs functions to Promise-based
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const PUBLIC_DIR = isProd
  ? '/var/www/benzeta.shop/public'
  : path.join(process.cwd(), 'src', 'public');
const PLATE_PHOTOS_DIR = path.join(PUBLIC_DIR, 'plate-photos');

// Ensure directories exist
const ensureDirectoriesExist = async () => {
  if (!(await existsAsync(PUBLIC_DIR))) {
    await mkdirAsync(PUBLIC_DIR, {
      recursive: true,
    });
  }
  if (!(await existsAsync(PLATE_PHOTOS_DIR))) {
    await mkdirAsync(PLATE_PHOTOS_DIR, {
      recursive: true,
    });
  }
};

// Initialize directories when service is loaded
ensureDirectoriesExist().catch((err) => {
  console.error('Failed to create directories:', err);
});

export default {
  /**
   * Process file upload from multipart form data using formidable
   * @param req Express request object containing the file
   * @param fieldName Form field name that contains the file
   * @param fileNamePrefix Prefix to use for the file name
   * @returns Object containing the path to the saved file
   */
  async saveUploadedImage(
    req: Request,
    fieldName: string,
    fileNamePrefix: string,
  ): Promise<string> {
    await ensureDirectoriesExist();

    return new Promise((resolve, reject) => {
      // Create a new formidable form instance
      const form = formidable({
        // File will be stored in a temporary directory first
        keepExtensions: true,
        // Limit file size to 10MB
        maxFileSize: 10 * 1024 * 1024,
        // Only allow image files
        filter: (part) => {
          return part.mimetype?.includes('image/') || false;
        },
      });

      // Parse the form
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(new Error(`Error parsing form: ${err.message}`));
          return;
        }

        // Get the uploaded file
        const file = Array.isArray(files[fieldName]) ? files[fieldName][0] : files[fieldName];

        if (!file) {
          reject(new Error(`No file uploaded with field name '${fieldName}'`));
          return;
        }

        const originalFilename = file.originalFilename || 'image.jpg';
        const extension = path.extname(originalFilename) || '.jpg';
        const timestamp = Date.now();
        const uniqueFilename = `${fileNamePrefix}_${timestamp}${extension}`;

        // Full path where the file will be saved
        const targetPath = path.join(PLATE_PHOTOS_DIR, uniqueFilename);

        // Move the file from temp directory to target directory
        fs.copyFile(file.filepath, targetPath, (copyErr) => {
          // Delete the temp file
          fs.unlink(file.filepath, () => {});

          if (copyErr) {
            reject(new Error(`Error moving uploaded file: ${copyErr.message}`));
            return;
          }

          resolve(`/plate-photos/${uniqueFilename}`);
        });
      });
    });
  },

  /**
   * Get the absolute file path for a relative path
   * @param relativePath Relative path to the file (starting with /)
   * @returns Absolute path to the file
   */
  getFilePath(relativePath: string): string {
    // Ensure the path starts with /
    const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

    return path.join(PUBLIC_DIR, normalizedPath);
  },

  /**
   * Check if a file exists at the specified path
   * @param relativePath Relative path to the file
   * @returns True if the file exists, false otherwise
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const filePath = this.getFilePath(relativePath);
    return existsAsync(filePath);
  },

  /**
   * Create a read stream for a file
   * @param relativePath Relative path to the file
   * @returns Read stream for the file
   */
  createReadStream(relativePath: string) {
    const filePath = this.getFilePath(relativePath);
    return fs.createReadStream(filePath);
  },

  /**
   * Get the MIME type for an image file based on its extension
   * @param relativePath Relative path to the file
   * @returns MIME type for the image file
   */
  getImageMimeType(relativePath: string): string {
    const extension = path.extname(relativePath).toLowerCase();

    // Common image MIME types
    const imageMimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };

    return imageMimeTypes[extension] || 'image/jpeg'; // Default to JPEG if unknown
  },
};
