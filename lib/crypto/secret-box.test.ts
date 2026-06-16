/**
 * AES-GCM secret box — pure unit tests (no DB, no network).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  encryptSecret,
  decryptSecret,
  isEncryptionConfigured,
  secretsEqual,
  EncryptionNotConfiguredError,
  DecryptionError,
} from './secret-box';

const KEY_A = randomBytes(32).toString('base64');
const KEY_B = randomBytes(32).toString('base64');

describe('secret-box', () => {
  let original: string | undefined;
  beforeEach(() => {
    original = process.env.CREDENTIAL_ENCRYPTION_KEY;
    process.env.CREDENTIAL_ENCRYPTION_KEY = KEY_A;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    else process.env.CREDENTIAL_ENCRYPTION_KEY = original;
  });

  it('round-trips a secret', () => {
    const blob = encryptSecret('sk_live_super_secret');
    expect(blob.startsWith('v1.')).toBe(true);
    expect(decryptSecret(blob)).toBe('sk_live_super_secret');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('never stores the plaintext in the blob', () => {
    const blob = encryptSecret('PLAINTEXT_TOKEN');
    expect(blob).not.toContain('PLAINTEXT_TOKEN');
  });

  it('detects tampering (GCM auth failure)', () => {
    const blob = encryptSecret('tamper-me');
    const parts = blob.split('.');
    // Flip a byte in the ciphertext.
    const ct = Buffer.from(parts[3]!, 'base64');
    ct[0] = ct[0]! ^ 0xff;
    parts[3] = ct.toString('base64');
    expect(() => decryptSecret(parts.join('.'))).toThrow(DecryptionError);
  });

  it('fails to decrypt with the wrong key', () => {
    const blob = encryptSecret('secret');
    process.env.CREDENTIAL_ENCRYPTION_KEY = KEY_B;
    expect(() => decryptSecret(blob)).toThrow(DecryptionError);
  });

  it('rejects a malformed blob', () => {
    expect(() => decryptSecret('not-a-valid-blob')).toThrow(DecryptionError);
    expect(() => decryptSecret('v2.a.b.c')).toThrow(DecryptionError);
  });

  it('throws when no key is configured', () => {
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret('x')).toThrow(EncryptionNotConfiguredError);
  });

  it('reports configured state correctly', () => {
    expect(isEncryptionConfigured()).toBe(true);
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'too-short';
    expect(isEncryptionConfigured()).toBe(false);
  });

  it('secretsEqual is correct and length-aware', () => {
    expect(secretsEqual('abc', 'abc')).toBe(true);
    expect(secretsEqual('abc', 'abd')).toBe(false);
    expect(secretsEqual('abc', 'abcd')).toBe(false);
  });
});
