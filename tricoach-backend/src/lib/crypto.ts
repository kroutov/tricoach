import crypto from 'crypto';
import { config } from '../config';

// Derives a stable 256-bit key from the configured secret rather than
// requiring a separate base64 key to manage in .env for this MVP. Swap for
// a dedicated KMS-backed key before handling real user tokens in production.
const key = crypto.scryptSync(config.jwtSecret, 'tricoach-token-encryption', 32);

/** AES-256-GCM encrypt, returning `iv:authTag:ciphertext` as a single base64-joined string. */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString('base64')).join(':');
}

export function decryptToken(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error('Malformed encrypted token');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}
