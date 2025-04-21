// Define interface for custom errors
export interface ICustomError extends Error {
  code?: string;
  errorCode?: string;
  status?: number;
  details?: any;
}
