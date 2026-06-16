/**
 * Backend resolution for the live integration.
 *
 * Order of resolution:
 *   1. `forceSandbox` (or no HTTP backend wired) -> SandboxLiveApiClient.
 *   2. A configured `baseUrl` + `apiKey` -> HttpLiveApiClient (real, sanctioned).
 *   3. Neither -> throw LiveBackendNotConfiguredError. We NEVER guess a network
 *      target; a missing config fails loudly.
 */
import { SandboxLiveApiClient } from './sandbox-client';
import { HttpLiveApiClient } from './http-client';
import { LiveBackendNotConfiguredError } from './errors';
import type { LiveApiClient } from './contract';
import type { GenerateOptions } from '@/fixtures/generators';

export interface ResolveLiveOptions {
  /** Force the offline sandbox regardless of env (used for "test sync"). */
  forceSandbox?: boolean;
  /** Per-account API key (decrypted from credentialRef) for the HTTP backend. */
  apiKey?: string;
  /** Override the base URL (defaults to LIVE_API_BASE_URL). */
  baseUrl?: string;
  sandboxOpts?: GenerateOptions;
  fetchImpl?: typeof fetch;
}

/** True when a real HTTP backend base URL is configured. */
export function isLiveHttpConfigured(): boolean {
  return Boolean(process.env.LIVE_API_BASE_URL);
}

export function resolveLiveClient(
  opts: ResolveLiveOptions = {},
): LiveApiClient {
  if (opts.forceSandbox) {
    return new SandboxLiveApiClient(opts.sandboxOpts);
  }

  const baseUrl = opts.baseUrl ?? process.env.LIVE_API_BASE_URL;
  const apiKey = opts.apiKey ?? process.env.LIVE_API_KEY;

  if (baseUrl && apiKey) {
    return new HttpLiveApiClient({
      baseUrl,
      apiKey,
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
    });
  }

  throw new LiveBackendNotConfiguredError();
}
