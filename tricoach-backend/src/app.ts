import cors from 'cors';
import express, { Express } from 'express';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { webhookRateLimit } from './middleware/rateLimit';
import { requireAuth } from './middleware/requireAuth';
import { authRouter } from './modules/auth/routes';
import { dashboardRouter } from './modules/dashboard/routes';
import { garminRouter } from './modules/integrations/garmin';
import { healthkitRouter } from './modules/integrations/healthkit';
import { stravaRouter } from './modules/integrations/strava';
import { calendarFeedRouter } from './modules/me/calendarFeed';
import { meRouter } from './modules/me/routes';
import { nutritionMeRouter, nutritionRouter } from './modules/nutrition/routes';
import { plansRouter } from './modules/plans/routes';
import { stravaWebhookRouter } from './modules/webhooks/strava';
import { workoutsRouter } from './modules/workouts/routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  // Bearer-token auth (not cookies), so credentials: false is correct here
  // — no cross-site cookie/session to protect. Origins are an explicit
  // allowlist (CORS_ORIGINS env var) rather than "*" since the web client
  // is a specific known frontend, not a public API for arbitrary sites.
  app.use(cors({ origin: config.corsOrigins, credentials: false }));
  app.use(express.json());

  if (config.env !== 'test') {
    app.use((req, _res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'tricoach-backend' });
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  // Public — calendar apps fetch this with no Authorization header (the
  // capability lives in the `token` query param). Must be registered before
  // `/me`'s requireAuth gate below, since it's a sub-path of it.
  api.use('/me/calendar.ics', calendarFeedRouter);
  // Must be registered before `/me`'s requireAuth gate below, since it's a
  // sub-path of it and needs its own sub-router rather than falling through.
  api.use('/me/nutrition', requireAuth, nutritionMeRouter);
  api.use('/me', requireAuth, meRouter);
  api.use('/nutrition', requireAuth, nutritionRouter);
  api.use('/plans', requireAuth, plansRouter);
  api.use('/workouts', requireAuth, workoutsRouter);
  api.use('/integrations/healthkit', requireAuth, healthkitRouter);
  // stravaRouter applies requireAuth per-route itself: /callback has no bearer
  // token available (Strava redirects the browser there directly).
  api.use('/integrations/strava', stravaRouter);
  api.use('/integrations/garmin', requireAuth, garminRouter);
  api.use('/webhooks/strava', webhookRateLimit, stravaWebhookRouter);
  api.use('/dashboard', requireAuth, dashboardRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
