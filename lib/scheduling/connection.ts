// Parse REDIS_URL into a plain BullMQ connection-options object. Passing options
// (rather than a constructed IORedis instance) lets BullMQ own its own ioredis
// copy and avoids dual-package type clashes between our ioredis and BullMQ's.

export interface RedisConnectionOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  // Required by BullMQ workers/blocking commands.
  maxRetriesPerRequest: null;
}

export function redisConnectionOptions(
  url: string = process.env.REDIS_URL ?? 'redis://localhost:6379',
): RedisConnectionOptions {
  const parsed = new URL(url);
  const opts: RedisConnectionOptions = {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? Number(parsed.port) : 6379,
    maxRetriesPerRequest: null,
  };
  if (parsed.username) opts.username = decodeURIComponent(parsed.username);
  if (parsed.password) opts.password = decodeURIComponent(parsed.password);
  const dbPath = parsed.pathname.replace(/^\//, '');
  if (dbPath) opts.db = Number(dbPath);
  return opts;
}
