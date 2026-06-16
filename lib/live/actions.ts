/**
 * Live write actions — send a message / create a post through the sanctioned
 * client, HUMAN-INITIATED. Every call is capability-checked and audited. When
 * the backing client is the sandbox, the action is simulated (no platform is
 * contacted) and the audit row is flagged `simulated: true`.
 *
 * There is no auto-send and no AI-authored content here: the caller passes the
 * exact body a person reviewed.
 */
import { writeAudit, type AuditInput } from '@/lib/audit';
import { resolveLiveClient, type ResolveLiveOptions } from './resolve';
import {
  sendMessageInputSchema,
  createPostInputSchema,
  type LiveApiClient,
  type LiveScope,
  type SendMessageInput,
  type CreatePostInput,
  type SendMessageResult,
  type CreatePostResult,
} from './contract';
import { LiveCapabilityError } from './errors';

/** Injectable audit sink so this module is unit-testable without a DB. */
export type AuditSink = (input: AuditInput) => Promise<unknown>;

export interface LiveActionCtx {
  /** Pre-built client (tests / explicit sandbox). */
  client?: LiveApiClient;
  /** Resolution options when no client is supplied. */
  resolve?: ResolveLiveOptions;
  actorUserId?: string | null;
  audit?: AuditSink;
}

function getClient(ctx: LiveActionCtx): LiveApiClient {
  return ctx.client ?? resolveLiveClient(ctx.resolve ?? {});
}

export interface LiveSendOutcome extends SendMessageResult {
  source: LiveApiClient['source'];
  simulated: boolean;
}

export async function sendMessageViaLive(
  scope: LiveScope,
  rawInput: SendMessageInput,
  ctx: LiveActionCtx = {},
): Promise<LiveSendOutcome> {
  const input = sendMessageInputSchema.parse(rawInput);
  const client = getClient(ctx);
  if (!client.capabilities(scope.platform).sendMessage) {
    throw new LiveCapabilityError('sendMessage');
  }
  const result = await client.sendMessage(scope, input);
  const simulated = client.source === 'sandbox';
  const audit = ctx.audit ?? writeAudit;
  await audit({
    actorUserId: ctx.actorUserId ?? null,
    action: 'LIVE_SEND_MESSAGE',
    entityType: 'PlatformAccount',
    entityId: scope.platformAccountId,
    metadata: {
      source: client.source,
      simulated,
      platform: scope.platform,
      fanExternalRef: input.fanExternalRef,
      externalRef: result.externalRef,
      humanInitiated: true,
    },
  });
  return { ...result, source: client.source, simulated };
}

export interface LivePostOutcome extends CreatePostResult {
  source: LiveApiClient['source'];
  simulated: boolean;
}

export async function createPostViaLive(
  scope: LiveScope,
  rawInput: CreatePostInput,
  ctx: LiveActionCtx = {},
): Promise<LivePostOutcome> {
  const input = createPostInputSchema.parse(rawInput);
  const client = getClient(ctx);
  if (!client.capabilities(scope.platform).createPost) {
    throw new LiveCapabilityError('createPost');
  }
  const result = await client.createPost(scope, input);
  const simulated = client.source === 'sandbox';
  const audit = ctx.audit ?? writeAudit;
  await audit({
    actorUserId: ctx.actorUserId ?? null,
    action: 'LIVE_CREATE_POST',
    entityType: 'PlatformAccount',
    entityId: scope.platformAccountId,
    metadata: {
      source: client.source,
      simulated,
      platform: scope.platform,
      externalRef: result.externalRef,
      humanInitiated: true,
    },
  });
  return { ...result, source: client.source, simulated };
}
