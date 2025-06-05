import {
  GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, 
} from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

// Initialize the Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Helper function to convert an image file to a base64 string
 * @param imagePath Path to the image file
 * @returns Base64 encoded image string
 */
const fileToGenerativePart = async (imagePath: string) => {
  const imageData = await readFileAsync(imagePath);
  const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

  return {
    inlineData: {
      data: imageData.toString('base64'),
      mimeType,
    },
  };
};

/**
 * Service for Gemini AI operations
 */
export default {
  /**
   * Extract plate number from an image
   * @param imagePath Full path to the image file
   * @returns Extracted plate number or null if not found
   */
  async extractPlateNumberFromImage(imagePath: string): Promise<string | null> {
    try {
      // Set up the model - use gemini-2.5-flash-preview-05-20 which is faster and still free tier
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-preview-05-20',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });

      // Convert image to the format expected by Gemini
      const imagePart = await fileToGenerativePart(imagePath);

      // Generate content with the model
      const result = await model.generateContent([
        'Extract the vehicle license plate number from this image. Return ONLY the plate number with no additional text, spaces, or formatting. If no plate is visible or readable, return "NO_PLATE_FOUND".',
        imagePart,
      ]);

      const response = result.response;
      const text = response.text().trim();

      // Return null if no plate was found
      if (text === 'NO_PLATE_FOUND') {
        return null;
      }

      return text;
    } catch (error) {
      console.error('Error extracting plate number:', error);
      return null;
    }
  },

  /**
   * Compare extracted plate number with the expected plate number
   * @param extractedPlate Plate number extracted from the image
   * @param expectedPlate Expected plate number to compare against
   * @returns True if the plates match, false otherwise
   */
  comparePlateNumbers(extractedPlate: string, expectedPlate: string): boolean {
    if (!extractedPlate || !expectedPlate) return false;

    // Normalize plate numbers: remove spaces, hyphens, dots and convert to uppercase
    const normalizedExtracted = extractedPlate.replace(/[\s\-./]/g, '').toUpperCase();
    const normalizedExpected = expectedPlate.replace(/[\s\-./]/g, '').toUpperCase();

    return normalizedExtracted === normalizedExpected;
  },
};
