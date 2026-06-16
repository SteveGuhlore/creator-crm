import { Rng, seedFromString } from './rng';
import {
  Platform,
  TransactionType,
  ContentType,
  MessageDirection,
} from '@/lib/db';
import type {
  NormalizedFan,
  NormalizedThread,
  NormalizedTransaction,
} from '@/lib/ingestion/types';

// Deterministic mock-data generators for all 5 platforms. Pure + reproducible:
// the same (platform, seed) always yields the same data, so seeding is idempotent.

const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Taylor',
  'Casey',
  'Riley',
  'Morgan',
  'Jamie',
  'Avery',
  'Quinn',
  'Devon',
  'Skyler',
  'Reese',
  'Parker',
  'Rowan',
  'Sage',
  'Drew',
  'Blake',
  'Cameron',
  'Emerson',
  'Finley',
];
const HANDLE_SUFFIX = ['x', '_vip', '99', '_fan', 'tx', '_88', '420', '_og'];

const FAN_TAGS = [
  'whale',
  'vip',
  'new',
  'lapsed',
  'big-tipper',
  'chatty',
  'ppv-buyer',
  'subscriber',
  'window-shopper',
  'loyal',
];

const TX_TYPES: TransactionType[] = [
  TransactionType.SUBSCRIPTION,
  TransactionType.DM,
  TransactionType.PPV,
  TransactionType.TIP,
  TransactionType.OTHER,
];

const CONTENT_TITLES = [
  'Beach photoset',
  'Behind the scenes',
  'Q&A video',
  'Bundle: summer',
  'Exclusive clip',
  'Lingerie set',
  'Workout vlog',
  'Cosplay shoot',
  'Bundle: best of',
  'Late night stream cut',
];
const CONTENT_TAGS = [
  'photoset',
  'video',
  'bundle',
  'exclusive',
  'free-preview',
  'ppv',
  'seasonal',
  'top-seller',
];

const MESSAGE_OUT = [
  'Hey! Thanks so much for subscribing 💕',
  'New content just dropped — check your feed!',
  'Want a custom? DM me what you like.',
  'Thank you for the tip, you’re the best!',
  'Miss you! Here’s a little something just for you.',
];
const MESSAGE_IN = [
  'Hi! Love your content 🔥',
  'Do you do customs?',
  'Just tipped you!',
  'When’s the next drop?',
  'You’re amazing, keep it up!',
];

// Per-platform revenue "personality" so analytics differ across platforms.
const PLATFORM_PROFILE: Record<
  Platform,
  {
    fanCount: [number, number];
    avgTxPerFan: [number, number];
    typeBias: TransactionType[];
  }
> = {
  [Platform.MANYVIDS]: {
    fanCount: [18, 28],
    avgTxPerFan: [1, 4],
    typeBias: [TransactionType.PPV, TransactionType.PPV, TransactionType.TIP],
  },
  [Platform.FANSLY]: {
    fanCount: [22, 34],
    avgTxPerFan: [2, 5],
    typeBias: [
      TransactionType.SUBSCRIPTION,
      TransactionType.SUBSCRIPTION,
      TransactionType.DM,
    ],
  },
  [Platform.HIDDEN]: {
    fanCount: [10, 18],
    avgTxPerFan: [1, 3],
    typeBias: [TransactionType.TIP, TransactionType.OTHER],
  },
  [Platform.ONLYFANS]: {
    fanCount: [30, 45],
    avgTxPerFan: [2, 6],
    typeBias: [
      TransactionType.SUBSCRIPTION,
      TransactionType.PPV,
      TransactionType.DM,
      TransactionType.TIP,
    ],
  },
  [Platform.SEXTPANTHER]: {
    fanCount: [12, 20],
    avgTxPerFan: [2, 5],
    typeBias: [TransactionType.DM, TransactionType.DM, TransactionType.PPV],
  },
};

function makeRng(platform: Platform, salt: string, baseSeed: number): Rng {
  return new Rng(seedFromString(`${platform}:${salt}`) ^ baseSeed);
}

export interface GenerateOptions {
  /** Base seed; same value → same data. Default 1. */
  seed?: number;
  /** ISO reference "now" so dates are stable across runs. */
  now?: Date;
}

const DEFAULT_NOW = new Date('2026-06-15T12:00:00.000Z');

export function generateFans(
  platform: Platform,
  opts: GenerateOptions = {},
): NormalizedFan[] {
  const seed = opts.seed ?? 1;
  const now = opts.now ?? DEFAULT_NOW;
  const rng = makeRng(platform, 'fans', seed);
  const profile = PLATFORM_PROFILE[platform];
  const count = rng.int(profile.fanCount[0], profile.fanCount[1]);

  const fans: NormalizedFan[] = [];
  for (let i = 0; i < count; i++) {
    const name = rng.pick(FIRST_NAMES);
    const suffix = rng.pick(HANDLE_SUFFIX);
    const firstSeen = rng.dateWithin(now, 365);
    const lastSeen = new Date(
      firstSeen.getTime() + rng.int(0, now.getTime() - firstSeen.getTime()),
    );
    fans.push({
      externalRef: `${platform.toLowerCase()}-fan-${i + 1}`,
      displayName: `${name}${suffix}`,
      tags: rng.sample(FAN_TAGS, rng.int(0, 3)),
      lifetimeValueCents: 0, // computed from transactions during ingest/seed
      firstSeenAt: firstSeen,
      lastSeenAt: lastSeen,
      notes: rng.bool(0.2) ? 'Imported from mock fixture.' : null,
    });
  }
  return fans;
}

export function generateTransactions(
  platform: Platform,
  fans: NormalizedFan[],
  opts: GenerateOptions = {},
): NormalizedTransaction[] {
  const seed = opts.seed ?? 1;
  const now = opts.now ?? DEFAULT_NOW;
  const rng = makeRng(platform, 'tx', seed);
  const profile = PLATFORM_PROFILE[platform];

  const txns: NormalizedTransaction[] = [];
  let counter = 1;
  for (const fan of fans) {
    const n = rng.int(profile.avgTxPerFan[0], profile.avgTxPerFan[1]);
    for (let j = 0; j < n; j++) {
      // Bias type selection toward this platform's profile.
      const type = rng.bool(0.7)
        ? rng.pick(profile.typeBias)
        : rng.pick(TX_TYPES);
      const gross = grossForType(rng, type);
      const net = Math.round(gross * (0.8 + rng.next() * 0.15)); // 80–95% net
      txns.push({
        externalRef: `${platform.toLowerCase()}-tx-${counter++}`,
        type,
        grossCents: gross,
        netCents: net,
        currency: 'USD',
        occurredAt: new Date(
          fan.firstSeenAt.getTime() +
            rng.int(0, Math.max(1, now.getTime() - fan.firstSeenAt.getTime())),
        ),
        fanExternalRef: fan.externalRef,
      });
    }
  }
  return txns;
}

function grossForType(rng: Rng, type: TransactionType): number {
  switch (type) {
    case TransactionType.SUBSCRIPTION:
      return rng.pick([999, 1499, 1999, 2499]);
    case TransactionType.PPV:
      return rng.int(500, 6000);
    case TransactionType.DM:
      return rng.int(300, 2500);
    case TransactionType.TIP:
      return rng.int(100, 10000);
    case TransactionType.OTHER:
      return rng.int(200, 3000);
  }
}

export function generateThreads(
  platform: Platform,
  fans: NormalizedFan[],
  opts: GenerateOptions = {},
): NormalizedThread[] {
  const seed = opts.seed ?? 1;
  const now = opts.now ?? DEFAULT_NOW;
  const rng = makeRng(platform, 'threads', seed);

  // ~60% of fans have a thread.
  const threadedFans = fans.filter(() => rng.bool(0.6));
  const threads: NormalizedThread[] = [];
  for (const fan of threadedFans) {
    const msgCount = rng.int(1, 6);
    const messages = [];
    let last = rng.dateWithin(now, 90);
    for (let m = 0; m < msgCount; m++) {
      const direction = rng.bool(0.5)
        ? MessageDirection.IN
        : MessageDirection.OUT;
      last = new Date(last.getTime() + rng.int(60_000, 3 * 24 * 3600_000));
      if (last > now) last = now;
      messages.push({
        externalRef: `${platform.toLowerCase()}-${fan.externalRef}-msg-${m + 1}`,
        direction,
        body:
          direction === MessageDirection.OUT
            ? rng.pick(MESSAGE_OUT)
            : rng.pick(MESSAGE_IN),
        sentAt: last,
      });
    }
    threads.push({
      fanExternalRef: fan.externalRef,
      lastMessageAt: messages[messages.length - 1]!.sentAt,
      messages,
    });
  }
  return threads;
}

export interface GeneratedContentItem {
  title: string;
  type: ContentType;
  tags: string[];
  storageRef: string;
  durationSec: number | null;
}

export function generateContent(
  platform: Platform,
  opts: GenerateOptions = {},
): GeneratedContentItem[] {
  const seed = opts.seed ?? 1;
  const rng = makeRng(platform, 'content', seed);
  const count = rng.int(6, 12);
  const items: GeneratedContentItem[] = [];
  const types = [ContentType.IMAGE, ContentType.VIDEO, ContentType.BUNDLE];
  for (let i = 0; i < count; i++) {
    const type = rng.pick(types);
    items.push({
      title: `${rng.pick(CONTENT_TITLES)} #${i + 1}`,
      type,
      tags: rng.sample(CONTENT_TAGS, rng.int(1, 3)),
      storageRef: `mock://${platform.toLowerCase()}/content/${i + 1}`,
      durationSec: type === ContentType.VIDEO ? rng.int(30, 1800) : null,
    });
  }
  return items;
}

/** Compute lifetime value per fan from their transactions (net cents). */
export function computeLifetimeValues(
  fans: NormalizedFan[],
  txns: NormalizedTransaction[],
): Map<string, number> {
  const ltv = new Map<string, number>();
  for (const fan of fans) ltv.set(fan.externalRef, 0);
  for (const tx of txns) {
    if (!tx.fanExternalRef) continue;
    ltv.set(tx.fanExternalRef, (ltv.get(tx.fanExternalRef) ?? 0) + tx.netCents);
  }
  return ltv;
}
