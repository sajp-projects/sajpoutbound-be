import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { CustomError } from '../middlewares/error';

const readFileAsync = promisify(fs.readFile);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new CustomError({
    message: 'GEMINI_API_KEY is not set',
    errorCode: 'GEMINI_API_KEY_NOT_SET',
    status: 500,
  });
}

// Initialize the Google Generative AI with API key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

      // Use a more detailed prompt to improve extraction accuracy
      const prompt = `
I need to extract a vehicle license plate number from this image.

Instructions:
1. Look for any text that resembles a license plate (usually a combination of letters and numbers)
2. Focus on rectangular plates typically mounted on the front or back of vehicles
3. Indonesian plates generally follow formats like: "B 1234 ABC", "AB 1234 CD", or similar patterns
4. ONLY return the raw plate text with no additional information, explanation, or formatting
5. If multiple plates are visible, return the most prominently displayed one
6. If no plate is clearly visible or readable, return "NO_PLATE_FOUND"

Example outputs:
- "B 1234 ABC"
- "AB 123 CD"
- "NO_PLATE_FOUND"
`;

      // Generate content with the model
      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;
      let text = response.text().trim();

      // Check if we got a response but no plate was found
      if (text === 'NO_PLATE_FOUND' || text.includes('NO_PLATE_FOUND')) {
        // Try a second attempt with a different prompt if first attempt failed
        const secondPrompt =
          'What license plate number do you see in this image? Only return the license plate text.';
        const secondResult = await model.generateContent([secondPrompt, imagePart]);
        text = secondResult.response.text().trim();

        // If still no result, return null
        if (
          !text ||
          text.toLowerCase().includes('no') ||
          text.toLowerCase().includes('not visible')
        ) {
          return null;
        }
      }

      // Clean up the plate number - remove any text that isn't part of the plate
      // Remove phrases like "the license plate is" or "I see"
      text = text
        .replace(/^(the )?license plate( number)? is /i, '')
        .replace(/^i see /i, '')
        .replace(/^plate( number)?: /i, '')
        .replace(/"/g, '') // Remove quotes
        .trim();

      // Return null for invalid responses
      if (
        text === 'NO_PLATE_FOUND' ||
        text.toLowerCase().includes('no plate') ||
        text.toLowerCase().includes('not visible') ||
        text.toLowerCase().includes('unable to')
      ) {
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

    // Check for exact match
    if (normalizedExtracted === normalizedExpected) {
      return true;
    }

    // Check if the normalized expected plate is contained within the extracted text
    // This helps when the AI returns extra information
    if (
      normalizedExtracted.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedExtracted)
    ) {
      return true;
    }

    // Calculate similarity (allowing for minor OCR errors)
    // If at least 80% of characters match in sequence, consider it a match
    const minLength = Math.min(normalizedExtracted.length, normalizedExpected.length);
    if (minLength > 3) {
      // Only for plates with enough characters
      let matchingChars = 0;
      for (let i = 0; i < minLength; i++) {
        if (normalizedExtracted[i] === normalizedExpected[i]) {
          matchingChars++;
        }
      }

      const matchPercentage = matchingChars / minLength;
      if (matchPercentage >= 0.8) {
        // 80% match threshold
        return true;
      }
    }

    return false;
  },
};
