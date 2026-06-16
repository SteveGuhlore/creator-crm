// Pure display helpers for the scheduled-sends UI. No DB calls.

import { ScheduledSendStatus, ScheduledSendKind } from '@/lib/db';

/** Map a ScheduledSendStatus to a badge variant + label. */
export function statusDisplay(status: ScheduledSendStatus): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (status) {
    case ScheduledSendStatus.DRAFT:
      return { label: 'Draft', variant: 'outline' };
    case ScheduledSendStatus.SCHEDULED:
      return { label: 'Scheduled', variant: 'default' };
    case ScheduledSendStatus.SENT_SIMULATED:
      return { label: 'Sent (simulated)', variant: 'secondary' };
    case ScheduledSendStatus.CANCELLED:
      return { label: 'Cancelled', variant: 'destructive' };
    case ScheduledSendStatus.FAILED:
      return { label: 'Failed', variant: 'destructive' };
    default: {
      // Exhaustive check — TypeScript will error if a new status is added
      // without updating this switch.
      const _exhaustive: never = status;
      return { label: String(_exhaustive), variant: 'outline' };
    }
  }
}

/** Human-readable label for a ScheduledSendKind. */
export function kindLabel(kind: ScheduledSendKind): string {
  switch (kind) {
    case ScheduledSendKind.POST:
      return 'Post';
    case ScheduledSendKind.MASS_MESSAGE:
      return 'Mass Message';
    case ScheduledSendKind.DM:
      return 'DM';
    default: {
      const _exhaustive: never = kind;
      return String(_exhaustive);
    }
  }
}

/** Format a Date (or ISO string) for display in the sends table. */
export function formatScheduledFor(date: Date | string | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
