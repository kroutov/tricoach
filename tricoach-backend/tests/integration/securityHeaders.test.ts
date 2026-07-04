import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db/client';

const app = createApp();

afterAll(async () => prisma.$disconnect());

describe('security headers', () => {
  it('applies helmet defaults (e.g. no-sniff, no framing)', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does not grant cross-origin access to any origin (no browser-based client exists)', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
