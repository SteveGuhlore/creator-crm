import { config } from 'dotenv';
import { execSync } from 'node:child_process';

// Runs once before the whole suite: ensure the TEST database has the current
// schema. Integration tests then truncate + reseed as needed.
export default function setup() {
  config({ path: '.env' });
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    // No dedicated test DB configured — DB integration tests will self-skip.
    return;
  }
  try {
    execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
      stdio: 'ignore',
      env: { ...process.env, DATABASE_URL: testUrl },
    });
  } catch {
    // Leave it to individual tests to skip if the DB is unreachable.
    // eslint-disable-next-line no-console
    console.warn('[global-setup] prisma db push on TEST_DATABASE_URL failed');
  }
}
