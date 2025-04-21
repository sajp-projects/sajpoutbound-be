/**
 * Success response data format
 *
 * @param data The data to include in the response
 * @returns A formatted success response object
 */
export const success = <T>(data: T | null = null) => {
  return {
    success: true,
    data,
  };
};

/**
 * Error response data format
 *
 * @param message Error message
 * @param errorType Error code/type
 * @param details Additional error details
 * @returns A formatted error response object
 */
export const error = (message: string, errorType: string, details?: any) => {
  return {
    success: false,
    message,
    errorType,
    details,
  };
};
