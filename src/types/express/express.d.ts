// Define a type for the JWT payload
interface JwtPayload {
  id?: string;
  userId?: string; // Add this field as it appears in the JWT token
  email: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

declare namespace Express {
  interface Request {
    user: JwtPayload;
  }
}
