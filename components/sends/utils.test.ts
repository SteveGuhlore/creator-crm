import { describe, it, expect } from 'vitest';
import { statusDisplay, kindLabel, formatScheduledFor } from './utils';
import { ScheduledSendStatus, ScheduledSendKind } from '@/lib/db';

describe('statusDisplay', () => {
  it('returns outline variant for DRAFT', () => {
    const r = statusDisplay(ScheduledSendStatus.DRAFT);
    expect(r.label).toBe('Draft');
    expect(r.variant).toBe('outline');
  });

  it('returns default variant for SCHEDULED', () => {
    const r = statusDisplay(ScheduledSendStatus.SCHEDULED);
    expect(r.label).toBe('Scheduled');
    expect(r.variant).toBe('default');
  });

  it('returns secondary variant for SENT_SIMULATED', () => {
    const r = statusDisplay(ScheduledSendStatus.SENT_SIMULATED);
    expect(r.label).toBe('Sent (simulated)');
    expect(r.variant).toBe('secondary');
  });

  it('returns destructive variant for CANCELLED', () => {
    const r = statusDisplay(ScheduledSendStatus.CANCELLED);
    expect(r.variant).toBe('destructive');
  });

  it('returns destructive variant for FAILED', () => {
    const r = statusDisplay(ScheduledSendStatus.FAILED);
    expect(r.variant).toBe('destructive');
  });
});

describe('kindLabel', () => {
  it('returns Post for POST', () => {
    expect(kindLabel(ScheduledSendKind.POST)).toBe('Post');
  });

  it('returns Mass Message for MASS_MESSAGE', () => {
    expect(kindLabel(ScheduledSendKind.MASS_MESSAGE)).toBe('Mass Message');
  });

  it('returns DM for DM', () => {
    expect(kindLabel(ScheduledSendKind.DM)).toBe('DM');
  });
});

describe('formatScheduledFor', () => {
  it('returns em-dash for null', () => {
    expect(formatScheduledFor(null)).toBe('—');
  });

  it('formats a Date object', () => {
    const d = new Date('2025-06-15T14:30:00.000Z');
    const result = formatScheduledFor(d);
    // Should contain the year and time
    expect(result).toContain('2025');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats an ISO string', () => {
    const result = formatScheduledFor('2025-12-25T10:00:00.000Z');
    expect(result).toContain('2025');
    expect(result).toMatch(/Dec/i);
  });
});
