import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config';
import { ApiError } from '../../middleware/errorHandler';

export interface GoogleIdentity {
  googleId: string;
  email: string;
  fullName?: string;
}

/**
 * Verifies a Google Sign-In ID token via the official `google-auth-library`
 * (unlike Apple's, no hand-rolled JWKS verification needed — Google
 * provides this directly). See
 * https://developers.google.com/identity/sign-in/web/backend-auth
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!config.googleClientId) {
    throw new ApiError(503, 'google_oauth_not_configured');
  }

  const client = new OAuth2Client(config.googleClientId);
  const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new ApiError(401, 'invalid_google_token');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    fullName: payload.name,
  };
}
