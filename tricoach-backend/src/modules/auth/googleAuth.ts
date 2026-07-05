import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../../config';
import { ApiError } from '../../middleware/errorHandler';

const client = jwksClient({ jwksUri: 'https://www.googleapis.com/oauth2/v3/certs' });

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error('Unknown Google signing key'));
      return;
    }
    callback(null, key.getPublicKey());
  });
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  fullName?: string;
}

/**
 * Verifies a Google Sign-In ID token against Google's public keys directly
 * (mirrors appleAuth.ts) rather than via `google-auth-library`'s
 * `OAuth2Client.verifyIdToken` — that method only knows how to fetch certs
 * from the legacy PEM-format `oauth2/v1/certs` endpoint when running under
 * Node.js (its browser-crypto/JWK path gates on `typeof window`, which never
 * exists server-side), and Google has restricted that legacy endpoint (403
 * "does not have permission"). The JWK endpoint used here has no such
 * restriction.
 */
export function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  if (!config.googleClientId) {
    return Promise.reject(new ApiError(503, 'google_oauth_not_configured'));
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      idToken,
      getSigningKey,
      { algorithms: ['RS256'], issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: config.googleClientId },
      (err, decoded) => {
        if (err || !decoded || typeof decoded === 'string' || !decoded.sub || !decoded.email) {
          reject(err ?? new ApiError(401, 'invalid_google_token'));
          return;
        }
        resolve({
          googleId: decoded.sub as string,
          email: decoded.email as string,
          fullName: (decoded.name as string | undefined) ?? undefined,
        });
      }
    );
  });
}
