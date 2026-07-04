import { z } from 'zod';

/**
 * UUIDs from Swift (`UUID().uuidString`) are uppercase; ids generated in
 * Node (`crypto.randomUUID()`, used by Prisma's `@default(uuid())`) are
 * lowercase. The `id` columns are plain `text`, so Postgres compares them
 * case-sensitively — always normalize to lowercase at the boundary.
 */
export const uuidString = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
