import { z } from 'zod';
import {
  Platform,
  TransactionType,
  ContentType,
  MessageDirection,
  ScheduledSendKind,
  ScheduledSendStatus,
  Role,
} from '@/lib/db';

// Zod enums derived from Prisma enums — the single source of truth for input
// validation at every boundary. Using nativeEnum keeps them in lockstep.
export const zPlatform = z.nativeEnum(Platform);
export const zTransactionType = z.nativeEnum(TransactionType);
export const zContentType = z.nativeEnum(ContentType);
export const zMessageDirection = z.nativeEnum(MessageDirection);
export const zScheduledSendKind = z.nativeEnum(ScheduledSendKind);
export const zScheduledSendStatus = z.nativeEnum(ScheduledSendStatus);
export const zRole = z.nativeEnum(Role);

export const zCuid = z.string().min(1);
export const zCents = z.number().int();
export const zCurrency = z.string().length(3).default('USD');

/** Coerce a variety of date inputs (ISO string, epoch) to a Date. */
export const zDate = z.coerce.date();

/** Tags: trimmed, deduped, non-empty strings. */
export const zTags = z
  .array(z.string().trim().min(1))
  .default([])
  .transform((tags) => Array.from(new Set(tags)));
