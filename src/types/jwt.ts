export interface JwtPayload {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
  role?: string;
  roleId?: string;
  iat?: number;
  exp?: number;
}
