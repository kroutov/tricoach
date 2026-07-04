import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../../config';

const client = jwksClient({ jwksUri: 'https://appleid.apple.com/auth/keys' });

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error('Unknown Apple signing key'));
      return;
    }
    callback(null, key.getPublicKey());
  });
}

export interface AppleIdentity {
  appleUserId: string;
  email?: string;
}

/**
 * Verifies a Sign In with Apple identity token against Apple's public keys.
 * See https://developer.apple.com/documentation/sign_in_with_apple/verifying_a_user
 */
export function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getSigningKey,
      { algorithms: ['RS256'], issuer: 'https://appleid.apple.com', audience: config.appleBundleId },
      (err, decoded) => {
        if (err || !decoded || typeof decoded === 'string') {
          reject(err ?? new Error('Invalid Apple identity token'));
          return;
        }
        resolve({
          appleUserId: decoded.sub as string,
          email: (decoded.email as string | undefined) ?? undefined,
        });
      }
    );
  });
}
