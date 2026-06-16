/**
 * AES-256-GCM secret box for credentials at rest.
 *
 * Used to encrypt the per-account API credential stored in
 * `PlatformAccount.credentialRef` (and the proxy ref). Plaintext credentials
 * NEVER touch the database — only the versioned ciphertext blob produced here.
 *
 * The key is read from `CREDENTIAL_ENCRYPTION_KEY` (base64-encoded 32 bytes).
 * Generate one with:  openssl rand -base64 32
 *
 * Key is read lazily at call time (not module load) so tests and runtime can
 * configure the environment before first use.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32; // AES-256
const VERSION = 'v1';

export class EncryptionNotConfiguredError extends Error {
  constructor() {
    super(
      'CREDENTIAL_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`.',
    );
    this.name = 'EncryptionNotConfiguredError';
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

/** True when a usable encryption key is configured. */
export function isEncryptionConfigured(): boolean {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) return false;
  try {
    return Buffer.from(raw, 'base64').length === KEY_BYTES;
  } catch {
    return false;
  }
}

function loadKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) throw new EncryptionNotConfiguredError();
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new EncryptionNotConfiguredError();
  }
  return key;
}

/**
 * Encrypt a plaintext secret. Returns a self-describing blob:
 *   v1.<ivB64>.<authTagB64>.<ciphertextB64>
 */
export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

/**
 * Decrypt a blob produced by {@link encryptSecret}. Throws DecryptionError on
 * a malformed blob, wrong key, or tampered ciphertext (GCM auth failure).
 */
export function decryptSecret(blob: string): string {
  const key = loadKey();
  const parts = blob.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new DecryptionError('Malformed or unsupported ciphertext blob.');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64!, 'base64');
  const tag = Buffer.from(tagB64!, 'base64');
  const ciphertext = Buffer.from(ctB64!, 'base64');
  if (iv.length !== IV_BYTES) {
    throw new DecryptionError('Invalid IV length.');
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch {
    // GCM auth failure (wrong key or tampered data) — never leak details.
    throw new DecryptionError(
      'Decryption failed (wrong key or tampered data).',
    );
  }
}

/**
 * Constant-time equality for two secrets, for callers that need to compare a
 * provided value against a decrypted one without a timing side-channel.
 */
export function secretsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
