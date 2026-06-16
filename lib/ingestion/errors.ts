/**
 * NotImplementedError — generic signal for an adapter capability that has not
 * been wired up yet. Callers must never catch and swallow this.
 */
export class NotImplementedError extends Error {
  constructor(message = 'not implemented') {
    super(message);
    this.name = 'NotImplementedError';
  }
}
