import { JwtPayload } from '../jwt';

declare global {
  namespace Express {
    // Augment the Request interface
    interface Request {
      user: JwtPayload;
    }
  }
}
