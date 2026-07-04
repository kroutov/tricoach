import 'dotenv/config';

/**
 * No insecure fallback: `jwtSecret` also derives the Strava token
 * encryption key (see `src/lib/crypto.ts`), so a missing env var used to
 * silently degrade both JWT signing and stored-token encryption to a
 * well-known default instead of failing loudly. Every legitimate path
 * (`.env` for dev, `tests/setupEnv.ts` for test, real secrets manager for
 * prod) already sets this explicitly.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  appleBundleId: process.env.APPLE_BUNDLE_ID ?? 'com.tricoach.ai',
  // Optional, unlike jwtSecret/databaseUrl: Google Sign-In is one auth path
  // among several (Apple, email/password), not a dependency of the whole
  // app — an unconfigured client shouldn't crash the entire server, just
  // that one route (see POST /auth/google's explicit check).
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  /** Custom URL scheme the iOS app registers to catch OAuth redirects (ASWebAuthenticationSession). */
  appScheme: process.env.APP_SCHEME ?? 'tricoach',
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  /** Web client's public URL — OAuth callbacks (Strava) redirect the browser here now that the web client is primary. */
  webPublicUrl: process.env.WEB_PUBLIC_URL ?? 'http://localhost:5173',
  strava: {
    clientId: process.env.STRAVA_CLIENT_ID ?? '',
    clientSecret: process.env.STRAVA_CLIENT_SECRET ?? '',
    webhookVerifyToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? '',
    get redirectUri() {
      return `${config.backendPublicUrl}/api/v1/integrations/strava/callback`;
    },
  },
};
