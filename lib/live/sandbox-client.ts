/**
 * SandboxLiveApiClient — a fully working two-way client backed by the local
 * mock generators. No network, no credentials, no scraping. Reads return
 * deterministic fixture data; writes are SIMULATED (they return a synthetic
 * externalRef and timestamp) so the dashboard's send/post flows can be
 * exercised end-to-end before a real API exists.
 */
import {
  generateFans,
  generateTransactions,
  generateThreads,
  type GenerateOptions,
} from '@/fixtures/generators';
import type {
  LiveApiClient,
  LiveCapabilities,
  LiveScope,
  SendMessageInput,
  SendMessageResult,
  CreatePostInput,
  CreatePostResult,
} from './contract';
import type { Platform } from '@/lib/db';

export class SandboxLiveApiClient implements LiveApiClient {
  readonly source = 'sandbox' as const;
  private readonly opts: GenerateOptions;

  constructor(opts: GenerateOptions = {}) {
    this.opts = opts;
  }

  capabilities(_platform: Platform): LiveCapabilities {
    return {
      readFans: true,
      readTransactions: true,
      readMessages: true,
      sendMessage: true,
      createPost: true,
    };
  }

  async listFans(scope: LiveScope) {
    return generateFans(scope.platform, this.opts);
  }

  async listTransactions(scope: LiveScope) {
    const fans = await this.listFans(scope);
    return generateTransactions(scope.platform, fans, this.opts);
  }

  async listThreads(scope: LiveScope) {
    const fans = await this.listFans(scope);
    return generateThreads(scope.platform, fans, this.opts);
  }

  async sendMessage(
    _scope: LiveScope,
    _input: SendMessageInput,
  ): Promise<SendMessageResult> {
    // Simulated: no platform is contacted. The caller is responsible for
    // recording an audit entry that marks this as a sandbox action.
    return {
      externalRef: `sandbox-msg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      sentAt: new Date(),
    };
  }

  async createPost(
    _scope: LiveScope,
    _input: CreatePostInput,
  ): Promise<CreatePostResult> {
    return {
      externalRef: `sandbox-post-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      createdAt: new Date(),
    };
  }
}
