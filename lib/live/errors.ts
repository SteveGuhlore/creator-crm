/**
 * Errors for the live (sanctioned-API) integration layer.
 *
 * These exist so callers can distinguish "no backend wired up" (expected until
 * you stand up your API) from "the backend rejected the call" — and so a
 * missing configuration can NEVER silently fall through to a network guess.
 */

export class LiveBackendNotConfiguredError extends Error {
  constructor(
    message = 'No live backend configured. Set LIVE_API_BASE_URL (+ a connected account credential) or use sandbox mode.',
  ) {
    super(message);
    this.name = 'LiveBackendNotConfiguredError';
  }
}

export class LiveApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'LiveApiError';
    this.status = status;
  }
}

/**
 * Thrown when a write action (send/post) is attempted against a backend or
 * platform that does not advertise that capability. Keeps the dashboard honest
 * about what each connection can actually do.
 */
export class LiveCapabilityError extends Error {
  constructor(capability: string) {
    super(`This connection does not support "${capability}".`);
    this.name = 'LiveCapabilityError';
  }
}
