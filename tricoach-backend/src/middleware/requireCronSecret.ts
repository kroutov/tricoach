import { NextFunction, Request, Response } from 'express';
import { config } from '../config';

/**
 * Gates the scheduled weekly-menu-proposal trigger (see
 * `.github/workflows/propose-weekly-menu.yml`) — a system-to-system call
 * with no specific user, so a bearer JWT (`requireAuth`) doesn't apply.
 * `config.cronSecret` unset means nobody can ever authenticate, not that
 * the endpoint opens up.
 */
export function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!config.cronSecret || !token || token !== config.cronSecret) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or missing cron secret' });
    return;
  }
  next();
}
