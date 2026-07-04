import { verifyGoogleIdToken } from '../src/modules/auth/googleAuth';
import { ApiError } from '../src/middleware/errorHandler';

describe('verifyGoogleIdToken', () => {
  it('fails with a clear 503 rather than crashing when GOOGLE_CLIENT_ID is unset (test env default)', async () => {
    await expect(verifyGoogleIdToken('whatever-token')).rejects.toMatchObject(
      new ApiError(503, 'google_oauth_not_configured')
    );
  });
});
