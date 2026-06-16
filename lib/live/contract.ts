/**
 * Live API contract — the shape of YOUR future sanctioned API (or an authorized
 * gateway). Every live client (sandbox today, HTTP tomorrow) implements this,
 * and the dashboard only ever talks to this interface — never to a platform's
 * private web endpoints.
 *
 * The contract is deliberately two-way but HUMAN-INITIATED: the dashboard reads
 * data and performs send/post actions that a person explicitly triggers. There
 * is no auto-reply, no scheduling-without-review, and no AI authored content.
 */
import { z } from 'zod';
import {
  normalizedFanSchema,
  normalizedTransactionSchema,
  normalizedThreadSchema,
  type NormalizedFan,
  type NormalizedTransaction,
  type NormalizedThread,
} from '@/lib/ingestion/types';
import type { Platform } from '@/lib/db';

// Re-export read schemas so HTTP clients can validate responses in one place.
export {
  normalizedFanSchema,
  normalizedTransactionSchema,
  normalizedThreadSchema,
};

/** What a given connection can actually do. Drives UI affordances + guards. */
export interface LiveCapabilities {
  readFans: boolean;
  readTransactions: boolean;
  readMessages: boolean;
  sendMessage: boolean;
  createPost: boolean;
}

export const ALL_CAPABILITIES_OFF: LiveCapabilities = {
  readFans: false,
  readTransactions: false,
  readMessages: false,
  sendMessage: false,
  createPost: false,
};

/** Identifies which (model, account) a call operates on. */
export interface LiveScope {
  modelId: string;
  platformAccountId: string;
  platform: Platform;
}

// --- Write inputs / results -------------------------------------------------

export const sendMessageInputSchema = z.object({
  /** Platform-side fan id the message is addressed to. */
  fanExternalRef: z.string().min(1),
  body: z.string().min(1),
  /** Opaque references to already-uploaded media (no content generation). */
  mediaRefs: z.array(z.string()).default([]),
});
export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export const sendMessageResultSchema = z.object({
  externalRef: z.string().min(1),
  sentAt: z.coerce.date(),
});
export type SendMessageResult = z.infer<typeof sendMessageResultSchema>;

export const createPostInputSchema = z.object({
  body: z.string().min(1),
  mediaRefs: z.array(z.string()).default([]),
});
export type CreatePostInput = z.infer<typeof createPostInputSchema>;

export const createPostResultSchema = z.object({
  externalRef: z.string().min(1),
  createdAt: z.coerce.date(),
});
export type CreatePostResult = z.infer<typeof createPostResultSchema>;

/**
 * The unified two-way client. `source` records provenance for audit:
 * 'sandbox' = simulated locally, 'http' = a real sanctioned backend.
 */
export interface LiveApiClient {
  readonly source: 'sandbox' | 'http';
  capabilities(platform: Platform): LiveCapabilities;

  // Reads
  listFans(scope: LiveScope): Promise<NormalizedFan[]>;
  listTransactions(scope: LiveScope): Promise<NormalizedTransaction[]>;
  listThreads(scope: LiveScope): Promise<NormalizedThread[]>;

  // Writes (human-initiated)
  sendMessage(
    scope: LiveScope,
    input: SendMessageInput,
  ): Promise<SendMessageResult>;
  createPost(
    scope: LiveScope,
    input: CreatePostInput,
  ): Promise<CreatePostResult>;
}
