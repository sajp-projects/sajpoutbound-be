import { NextFunction, Request, Response } from 'express';
import { CustomError } from '../middlewares/error';
import fileService from '../services/fileService';

export default {
  /**
   * Serve an image file from the public directory
   */
  async serveImageFile(req: Request, res: Response, next: NextFunction) {
    try {
      const filePath = req.params[0]; // Using wildcard route parameter

      // Check if file exists
      const fileExists = await fileService.fileExists(filePath);
      if (!fileExists) {
        throw new CustomError({
          message: 'Gambar tidak ditemukan',
          errorCode: 'GAMBAR_TIDAK_DITEMUKAN',
          status: 404,
        });
      }

      // Get the MIME type
      const mimeType = fileService.getImageMimeType(filePath);

      // Set content type header
      res.setHeader('Content-Type', mimeType);

      // Get the absolute file path
      const absolutePath = fileService.getFilePath(filePath);

      // Send the file
      res.sendFile(absolutePath);
    } catch (error) {
      next(error);
    }
  },
};
