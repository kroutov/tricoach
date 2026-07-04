import rateLimit from 'express-rate-limit';

/**
 * Auth endpoints do real cryptographic verification (Apple JWKS fetch +
 * signature check, JWT signing) per request — cheap to spam, so worth
 * blunting brute-force/DoS attempts specifically here rather than globally
 * (a global limit would also throttle legitimate high-frequency use of
 * `/workouts/:id/complete` etc. during normal training).
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Trop de tentatives, réessayez plus tard.' },
});

/** Strava webhook receiver — public URL, no auth, so also worth bounding. */
export const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Trop de tentatives, réessayez plus tard.' },
});
