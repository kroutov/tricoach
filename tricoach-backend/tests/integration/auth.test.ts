import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';
import { resetDb } from '../helpers/db';
import { devLogin } from '../helpers/auth';

const app = createApp();

afterEach(resetDb);
afterAll(async () => prisma.$disconnect());

describe('POST /auth/dev-login', () => {
  it('creates a user and returns a usable JWT', async () => {
    const { token, user } = await devLogin(app, { appleUserId: 'dev-1', email: 'a@b.com', fullName: 'Ada' });
    expect(token).toBeTruthy();
    expect(user.appleUserId).toBe('dev-1');
    expect(user.hasCompletedOnboarding).toBe(false);

    const me = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('a@b.com');
  });

  it('upserts rather than duplicating a user on repeated calls', async () => {
    await devLogin(app, { appleUserId: 'dev-2' });
    await devLogin(app, { appleUserId: 'dev-2' });
    const count = await prisma.user.count({ where: { appleUserId: 'dev-2' } });
    expect(count).toBe(1);
  });
});

describe('auth guard', () => {
  it('rejects protected routes without a bearer token', async () => {
    const res = await request(app).get('/api/v1/me');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/register', () => {
  it('creates a user with a hashed password and returns a usable JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new@example.com', password: 'supersecret123', fullName: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('new@example.com');

    const stored = await prisma.user.findUnique({ where: { email: 'new@example.com' } });
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe('supersecret123');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'dupe@example.com', password: 'supersecret123' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dupe@example.com', password: 'anotherpassword' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email_taken');
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'short@example.com', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('logs in with correct credentials', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'login@example.com', password: 'correctpassword' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'login@example.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects a wrong password with a generic error', async () => {
    await request(app).post('/api/v1/auth/register').send({ email: 'login2@example.com', password: 'correctpassword' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'login2@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('rejects an unknown email with the same generic error (no user enumeration)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'doesnotexist@example.com', password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('rejects login for an account that has no password set (Apple-only)', async () => {
    await devLogin(app, { appleUserId: 'apple-only-1', email: 'appleonly@example.com' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'appleonly@example.com', password: 'whatever123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });
});

describe('CORS', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('reflects Access-Control-Allow-Origin for an origin explicitly on the allowlist', async () => {
    jest.resetModules();
    process.env.CORS_ORIGINS = 'https://app.example.com';

    let scopedApp!: import('express').Express;
    jest.isolateModules(() => {
      scopedApp = require('../../src/app').createApp();
    });

    const res = await request(scopedApp).get('/health').set('Origin', 'https://app.example.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });
});

describe('rate limiting', () => {
  it('blocks repeated attempts against /auth/refresh past the limit, regardless of token validity', async () => {
    let lastStatus = 0;
    for (let i = 0; i < 21; i++) {
      const res = await request(app).post('/api/v1/auth/refresh').set('Authorization', 'Bearer not-a-real-token');
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe('dev-login production gating', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('is disabled (404) when NODE_ENV is production, even though it works in test', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';

    let prodApp!: import('express').Express;
    jest.isolateModules(() => {
      prodApp = require('../../src/app').createApp();
    });

    const res = await request(prodApp).post('/api/v1/auth/dev-login').send({ appleUserId: 'should-not-work' });
    expect(res.status).toBe(404);
  });
});
