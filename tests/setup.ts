// Vitest global setup. Loads env for tests.
import { config } from 'dotenv';

// Prefer .env, then allow .env.test overrides if present.
config({ path: '.env' });
config({ path: '.env.test', override: true });

// Route DB access at the dedicated test database when provided.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
