import bcrypt from 'bcrypt';
import { prisma } from '../../db/client';
import { ApiError } from '../../middleware/errorHandler';
import { signSession } from './jwt';

const BCRYPT_COST = 12;

export interface AuthResult {
  token: string;
  user: {
    id: string;
    appleUserId: string | null;
    email: string | null;
    fullName: string | null;
    createdAt: Date;
    hasCompletedOnboarding: boolean;
  };
}

interface UserRecord {
  id: string;
  appleUserId: string | null;
  email: string | null;
  fullName: string | null;
  createdAt: Date;
  hasCompletedOnboarding: boolean;
}

function toAuthResult(user: UserRecord): AuthResult {
  return {
    token: signSession({ userId: user.id }),
    user: {
      id: user.id,
      appleUserId: user.appleUserId,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    },
  };
}

async function issueSessionFor(appleUserId: string, email?: string, fullName?: string): Promise<AuthResult> {
  const user = await prisma.user.upsert({
    where: { appleUserId },
    update: email ? { email } : {},
    create: { appleUserId, email, fullName },
  });
  return toAuthResult(user);
}

async function registerWithPassword(email: string, password: string, fullName?: string): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'email_taken');

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await prisma.user.create({ data: { email, passwordHash, fullName } });
  return toAuthResult(user);
}

async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic error whether the account doesn't exist, has no password
  // (Apple-only), or the password is wrong — avoids leaking which case
  // applies (user enumeration).
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'invalid_credentials');
  }
  return toAuthResult(user);
}

export const authService = { issueSessionFor, registerWithPassword, loginWithPassword };
