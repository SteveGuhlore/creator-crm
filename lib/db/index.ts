// Stable import surface for the DB layer.
// Feature modules import Prisma types/enums from here, not the generated path.
export { prisma } from './client';
export {
  Role,
  Platform,
  PlatformAccountStatus,
  TransactionType,
  ContentType,
  MessageDirection,
  ScheduledSendKind,
  ScheduledSendStatus,
  Prisma,
} from '@/lib/generated/prisma';
export type {
  User,
  Model,
  PlatformAccount,
  Fan,
  Transaction,
  ContentItem,
  MessageThread,
  Message,
  MessageTemplate,
  ScheduledSend,
  PayoutSplit,
  AuditLog,
} from '@/lib/generated/prisma';

/** All platforms, in canonical display order. */
import { Platform as PlatformEnum } from '@/lib/generated/prisma';
export const ALL_PLATFORMS = [
  PlatformEnum.MANYVIDS,
  PlatformEnum.FANSLY,
  PlatformEnum.HIDDEN,
  PlatformEnum.ONLYFANS,
  PlatformEnum.SEXTPANTHER,
] as const;

/** Human-readable platform labels for UI. */
export const PLATFORM_LABELS: Record<PlatformEnum, string> = {
  [PlatformEnum.MANYVIDS]: 'ManyVids',
  [PlatformEnum.FANSLY]: 'Fansly',
  [PlatformEnum.HIDDEN]: 'hidden.com',
  [PlatformEnum.ONLYFANS]: 'OnlyFans',
  [PlatformEnum.SEXTPANTHER]: 'SextPanther',
};

/** URL slug per platform (used for per-platform routes). */
export const PLATFORM_SLUGS: Record<PlatformEnum, string> = {
  [PlatformEnum.MANYVIDS]: 'manyvids',
  [PlatformEnum.FANSLY]: 'fansly',
  [PlatformEnum.HIDDEN]: 'hidden',
  [PlatformEnum.ONLYFANS]: 'onlyfans',
  [PlatformEnum.SEXTPANTHER]: 'sextpanther',
};

export function platformFromSlug(slug: string): PlatformEnum | null {
  const entry = Object.entries(PLATFORM_SLUGS).find(([, s]) => s === slug);
  return entry ? (entry[0] as PlatformEnum) : null;
}
