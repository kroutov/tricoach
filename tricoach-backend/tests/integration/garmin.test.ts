import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { devLogin } from '../helpers/auth';
import { resetDb } from '../helpers/db';

const mockLogin = jest.fn();
const mockExportToken = jest.fn();
const mockGetUserProfile = jest.fn();
const mockGetUserSettings = jest.fn();
const mockGetActivities = jest.fn();
const mockLoadToken = jest.fn();

jest.mock('garmin-connect', () => ({
  GarminConnect: jest.fn().mockImplementation(() => ({
    login: mockLogin,
    exportToken: mockExportToken,
    getUserProfile: mockGetUserProfile,
    getUserSettings: mockGetUserSettings,
    getActivities: mockGetActivities,
    loadToken: mockLoadToken,
  })),
}));

const app = createApp();

function mockSuccessfulLogin(profileId = 555) {
  mockLogin.mockResolvedValue(undefined);
  mockExportToken.mockReturnValue({
    oauth1: { oauth_token: 't1', oauth_token_secret: 's1' },
    oauth2: {
      scope: 'x',
      jti: 'y',
      access_token: 'a',
      token_type: 'Bearer',
      refresh_token: 'r',
      expires_in: 3600,
      refresh_token_expires_in: 7200,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
  });
  mockGetUserProfile.mockResolvedValue({ id: profileId });
  mockGetUserSettings.mockResolvedValue({});
}

afterEach(() => {
  jest.clearAllMocks();
});
afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

describe('POST /integrations/garmin/connect', () => {
  it('logs in via the athlete\'s Garmin credentials and stores the encrypted session', async () => {
    const { token, user } = await devLogin(app);
    mockSuccessfulLogin();

    const res = await request(app)
      .post('/api/v1/integrations/garmin/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'athlete@example.com', password: 'secret' });

    expect(res.status).toBe(201);
    expect(res.body.connected).toBe(true);
    expect(mockLogin).toHaveBeenCalled();

    const connection = await prisma.deviceConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: 'GARMIN' } } });
    expect(connection).not.toBeNull();
    expect(connection?.providerUserId).toBe('555');
    expect(connection?.accessTokenEncrypted).toBeTruthy();
  });

  it('returns 401 when Garmin rejects the credentials', async () => {
    const { token } = await devLogin(app);
    mockLogin.mockRejectedValue(new Error('invalid credentials'));

    const res = await request(app)
      .post('/api/v1/integrations/garmin/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'athlete@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('garmin_invalid_credentials');
  });

  it('validates the request body', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).post('/api/v1/integrations/garmin/connect').set('Authorization', `Bearer ${token}`).send({});
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/integrations/garmin/connect').send({ username: 'a', password: 'b' });
    expect(res.status).toBe(401);
  });
});

describe('GET /integrations/garmin/status', () => {
  it('reports connected after a successful connect', async () => {
    const { token } = await devLogin(app);
    mockSuccessfulLogin();
    await request(app).post('/api/v1/integrations/garmin/connect').set('Authorization', `Bearer ${token}`).send({ username: 'a', password: 'b' });

    const res = await request(app).get('/api/v1/integrations/garmin/status').set('Authorization', `Bearer ${token}`);
    expect(res.body.connected).toBe(true);
  });

  it('reports not connected otherwise', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).get('/api/v1/integrations/garmin/status').set('Authorization', `Bearer ${token}`);
    expect(res.body.connected).toBe(false);
  });
});

describe('DELETE /integrations/garmin', () => {
  it('removes the stored connection', async () => {
    const { token, user } = await devLogin(app);
    mockSuccessfulLogin();
    await request(app).post('/api/v1/integrations/garmin/connect').set('Authorization', `Bearer ${token}`).send({ username: 'a', password: 'b' });

    const del = await request(app).delete('/api/v1/integrations/garmin').set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const connection = await prisma.deviceConnection.findFirst({ where: { userId: user.id, provider: 'GARMIN' } });
    expect(connection).toBeNull();
  });
});

describe('POST /integrations/garmin/sync', () => {
  it('returns 409 when Garmin is not connected', async () => {
    const { token } = await devLogin(app);
    const res = await request(app).post('/api/v1/integrations/garmin/sync').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('pulls recent activities via the restored session and ingests them once connected', async () => {
    const { token } = await devLogin(app);
    mockSuccessfulLogin();
    await request(app).post('/api/v1/integrations/garmin/connect').set('Authorization', `Bearer ${token}`).send({ username: 'a', password: 'b' });

    mockGetActivities.mockResolvedValue([
      {
        activityId: 777,
        startTimeGMT: new Date().toISOString().slice(0, 19).replace('T', ' '),
        duration: 1800,
        distance: 5000,
        averageHR: 150,
        maxHR: 170,
        activityType: { typeKey: 'running' },
      },
    ]);

    const res = await request(app).post('/api/v1/integrations/garmin/sync').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.activitiesIngested).toBe(1);
    expect(mockLoadToken).toHaveBeenCalled();

    const stored = await prisma.completedActivity.findFirst({ where: { externalId: '777' } });
    expect(stored?.source).toBe('GARMIN');
  });

  it('re-authenticates with the stored credentials when the saved session has expired', async () => {
    const { token } = await devLogin(app);
    mockSuccessfulLogin();
    await request(app).post('/api/v1/integrations/garmin/connect').set('Authorization', `Bearer ${token}`).send({ username: 'a', password: 'b' });

    // Session restore fails once, forcing a fresh login (still with the stored credentials).
    mockGetUserSettings.mockRejectedValueOnce(new Error('session expired'));
    mockGetActivities.mockResolvedValue([]);

    const res = await request(app).post('/api/v1/integrations/garmin/sync').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(mockLogin).toHaveBeenCalledTimes(2);
  });
});
