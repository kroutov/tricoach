import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface SessionPayload {
  userId: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (typeof decoded === 'string' || !('userId' in decoded)) {
    throw new Error('Invalid session token');
  }
  return { userId: decoded.userId as string };
}
