// `config/index.ts` calls `import 'dotenv/config'`, which re-reads the real
// `.env` file (repopulating JWT_SECRET/DATABASE_URL) on every fresh
// `require` after `jest.resetModules()` — stub it out so deleting an env
// var in a test actually stays deleted.
jest.mock('dotenv/config', () => ({}));

describe('config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('fails fast instead of silently defaulting when JWT_SECRET is unset', () => {
    jest.resetModules();
    delete process.env.JWT_SECRET;
    expect(() => require('../src/config')).toThrow('Missing required environment variable: JWT_SECRET');
  });

  it('fails fast instead of silently defaulting when DATABASE_URL is unset', () => {
    jest.resetModules();
    delete process.env.DATABASE_URL;
    expect(() => require('../src/config')).toThrow('Missing required environment variable: DATABASE_URL');
  });

  it('loads normally when both are set', () => {
    jest.resetModules();
    process.env.JWT_SECRET = 'a-real-secret';
    process.env.DATABASE_URL = 'postgresql://user@localhost:5432/db';
    expect(() => require('../src/config')).not.toThrow();
  });
});
