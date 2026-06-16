/**
 * NotImplementedError — thrown by LiveAdapter to signal that live platform
 * integration is deferred. Callers must never catch and swallow this.
 */
export class NotImplementedError extends Error {
  constructor(message = 'live integration is deferred') {
    super(message);
    this.name = 'NotImplementedError';
  }
}
