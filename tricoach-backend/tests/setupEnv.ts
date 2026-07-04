import 'dotenv/config';

// Point the Prisma client at the dedicated test database instead of dev,
// so integration tests never touch real data.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
