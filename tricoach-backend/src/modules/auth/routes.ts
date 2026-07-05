import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config';
import { requireAuth } from '../../middleware/requireAuth';
import { authRateLimit } from '../../middleware/rateLimit';
import { verifyAppleIdentityToken } from './appleAuth';
import { signSession } from './jwt';
import { authService } from './service';

const router = Router();

const appleSignInSchema = z.object({
  identityToken: z.string().min(1),
  fullName: z.string().optional(),
});

router.post('/apple', authRateLimit, async (req, res, next) => {
  try {
    const body = appleSignInSchema.parse(req.body);
    const identity = await verifyAppleIdentityToken(body.identityToken);
    const result = await authService.issueSessionFor(identity.appleUserId, identity.email, body.fullName);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

const devLoginSchema = z.object({
  appleUserId: z.string().min(1),
  email: z.string().email().optional(),
  fullName: z.string().optional(),
});

/**
 * Dev-only bypass mirroring the iOS app's "mode démo" — lets the full
 * client ↔ server flow be exercised without a configured Apple Developer
 * Team/entitlement. Disabled outside development/test.
 */
router.post('/dev-login', async (req, res, next) => {
  if (config.env === 'production') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  try {
    const body = devLoginSchema.parse(req.body);
    const result = await authService.issueSessionFor(body.appleUserId, body.email, body.fullName);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

router.post('/refresh', authRateLimit, requireAuth, (req, res) => {
  res.status(200).json({ token: signSession({ userId: req.userId! }) });
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
});

router.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.registerWithPassword(body.email, body.password, body.fullName);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.loginWithPassword(body.email, body.password);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

export const authRouter = router;
