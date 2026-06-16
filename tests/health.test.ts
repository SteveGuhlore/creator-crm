import { describe, it, expect } from 'vitest';
import { healthStatus } from '@/lib/health';
import { formatCents } from '@/lib/utils';

describe('healthStatus', () => {
  it('reports ok for the creator-crm service', () => {
    const h = healthStatus();
    expect(h.status).toBe('ok');
    expect(h.service).toBe('creator-crm');
    expect(typeof h.timestamp).toBe('string');
  });
});

describe('formatCents', () => {
  it('formats integer cents as USD', () => {
    expect(formatCents(12345)).toBe('$123.45');
    expect(formatCents(0)).toBe('$0.00');
  });
});
