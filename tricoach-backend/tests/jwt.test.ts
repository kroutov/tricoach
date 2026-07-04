import jwt from 'jsonwebtoken';
import { signSession, verifySession } from '../src/modules/auth/jwt';
import { config } from '../src/config';

describe('signSession / verifySession', () => {
  it('round-trips a userId', () => {
    const token = signSession({ userId: 'user-123' });
    expect(verifySession(token).userId).toBe('user-123');
  });

  it('rejects a token signed with a different secret (forged)', () => {
    const forged = jwt.sign({ userId: 'attacker' }, 'wrong-secret', { expiresIn: '1h' });
    expect(() => verifySession(forged)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 'user-123' }, config.jwtSecret, { expiresIn: -10 });
    expect(() => verifySession(expired)).toThrow(/expired/i);
  });

  it('rejects a malformed token string', () => {
    expect(() => verifySession('not-a-jwt-at-all')).toThrow();
  });

  it('rejects a validly-signed token missing the userId claim', () => {
    const noUserId = jwt.sign({ somethingElse: true }, config.jwtSecret, { expiresIn: '1h' });
    expect(() => verifySession(noUserId)).toThrow('Invalid session token');
  });
});
