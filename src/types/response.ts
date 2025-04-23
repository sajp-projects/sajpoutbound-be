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
