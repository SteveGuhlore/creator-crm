# Platform integration landscape (research, June 2026)

> Decision record for the live-integration layer. All access flows through the
> `LiveApiClient` contract (`lib/live/`); this doc records which backend each
> platform realistically uses. Sources are linked inline.

## TL;DR — what each platform supports

| Platform        | Official API?    | Realistic access      | Read                           | Write (DM/post) | CRM plan                                                |
| --------------- | ---------------- | --------------------- | ------------------------------ | --------------- | ------------------------------------------------------- |
| **Fanvue**      | ✅ OAuth2 (2025) | Official API          | ✅                             | ✅              | **Build official adapter first** (sanctioned, low risk) |
| **Reddit**      | ✅ OAuth2        | Official API          | Partial (NSFW read restricted) | ✅ post + DM    | Build official adapter (caveats below)                  |
| **OnlyFans**    | ❌ none          | Unofficial gateway    | ✅                             | ✅              | Gateway adapter, opt-in with keys (user's risk)         |
| **Fansly**      | ❌ none          | Unofficial gateway    | ✅                             | ✅              | Gateway adapter, opt-in with keys (user's risk)         |
| **MYM**         | ❌ none          | none (scrapers only)  | —                              | —               | CSV/manual                                              |
| **ManyVids**    | ❌ none          | none (affiliate only) | —                              | —               | CSV/manual                                              |
| **SextPanther** | ❌ none          | none (affiliate only) | —                              | —               | CSV/manual                                              |
| **Hidden.com**  | ❌ none          | none (new platform)   | —                              | —               | CSV/manual                                              |
| **LoyalFans**   | ❌ none          | unofficial scraper    | —                              | —               | CSV/manual                                              |
| **FeetFinder**  | ❌ none          | none                  | —                              | —               | CSV/manual                                              |

**Only Fanvue and Reddit expose sanctioned APIs.** Everything OnlyFans/Fansly is
reverse-engineered (session token + request signing + proxies); using it breaches
platform ToS and risks the account (ban risk HIGH; civil low–moderate; CFAA
criminal low for own-account use per hiQ/Sandvig).

## Official APIs

### Fanvue — https://api.fanvue.com/docs/welcome

- OAuth2 + API key (`X-Fanvue-API-Key`); KYC'd creator required; 100 req/60s.
- 140+ endpoints: chats/DMs, posts (create/schedule), media, subscribers,
  insights/earnings, agency multi-creator. App Store + MCP server.
- Policy: no reselling/sublicensing API access; no apps built "at a third party's
  request". Fine for managing your own accounts. https://legal.fanvue.com/api-policy

### Reddit — https://github.com/reddit-archive/reddit/wiki/oauth2

- OAuth2 (script/web/installed apps). Scopes: `submit` (posts), `privatemessages`
  (DMs), `identity`, `read`, `mysubreddits`, `modmail`.
- Free under **100 QPM**; paid ($0.24/1k) only matters for high-volume apps.
- **NSFW read restricted via API since Jul 2023.** Automated posting allowed as
  yourself but subject to per-subreddit + spam/90-10 rules.
- **Nov 2025 Responsible Builder Policy: new API keys require manual approval**
  (high rejection for hobby projects); pre-Nov-2025 keys grandfathered.

## OnlyFans gateways (all unofficial — no OnlyFans partnership)

| Provider        | Public pricing         | Connect model                         | Notes                                                           |
| --------------- | ---------------------- | ------------------------------------- | --------------------------------------------------------------- |
| OFAuth          | usage-based (gated)    | hosted redirect / embed / API mode    | "Plaid for OnlyFans"; sandbox advertised; most transparent docs |
| OnlyFansAPI.com | Free / $69 / $299      | API key + auth component (2FA+faceID) | 300+ endpoints, webhooks                                        |
| TheOnlyAPI      | Free / $20/acct (→$15) | API key                               | Zapier/Make/n8n                                                 |
| OFManager       | Free / $15/acct        | API key + TS SDK                      | WebSocket events                                                |
| oFANS / OF-API  | ~$99–$299              | API key + 2FA                         | OF-API powers Infloww, SuperCreator                             |

Capabilities (all): read fans/earnings/DMs, send DMs, mass/PPV, posts, webhooks.
Mechanism: capture OnlyFans session, sign requests, rotate proxies. Closed SaaS
dashboards (Infloww, Supercreator, Substy, CreatorXone, FansMetric) are NOT
callable as a backend; OnlyMonster has a partial REST API.
Refs: https://docs.ofauth.com/introduction/onlyfans-api · https://onlyfansapi.com/pricing

## Fansly gateways (all unofficial — Select Media LLC owns Fansly)

| Provider       | Entry / Pro   | Read        | Send DM | Posts              | Webhooks            | Entity                |
| -------------- | ------------- | ----------- | ------- | ------------------ | ------------------- | --------------------- |
| apifansly.com  | $49 / $129    | ✅          | ✅      | ✅ create+schedule | ✅ (Mar 2026)       | unincorporated        |
| fansly-api.com | $69 / $299    | ✅          | ✅      | ✅                 | ✅ HMAC; native n8n | Fans Holdings OÜ (EE) |
| Apify scrapers | $5/1k results | public only | ❌      | ❌                 | ❌                  | Apify                 |

Mechanism: submit Fansly login (email/pw/2FA) → store session token → proxy to
`apiv3.fansly.com`. No sandbox. **Fansly ToS (Jun 23 2025) bans chatbots/auto-
responders** (we don't do AI chat, so N/A). Refs: https://apifansly.com/pricing ·
https://www.fansly-api.com/pricing · https://www.404media.co/fansly-ban-furries-new-rules/

## Market size (mid-2026, for prioritization)

| Platform   | Creators  | Users       | GMV/yr             | Reliability               |
| ---------- | --------- | ----------- | ------------------ | ------------------------- |
| OnlyFans   | 4.63M     | 377.5M      | $7.22B             | Statutory accounts (hard) |
| Fansly     | ~2M (est) | ~130M (est) | $1–4B (unverified) | Estimates only            |
| MYM        | 500K      | 15M         | ~€95M              | Company-reported (2023)   |
| Fanvue     | 325K      | 17M MAU     | ~$200M ARR (≈GMV)  | Company-reported          |
| ManyVids   | —         | ~2.6M (old) | ~$3.3M net (est)   | Traffic tools             |
| Hidden.com | ~2.2K     | ~115K       | —                  | Unaudited (new, Apr 2025) |

Fanvue ≈ 3% of OnlyFans GMV but grew ~33× in 24 months on the AI-creator niche
(~15% of GMV). It is the **only** sanctioned live integration with zero ban risk.
Refs: https://variety.com/2025/digital/news/onlyfans-fiscal-2024-revenue-earnings-1236495750/ ·
https://fortune.com/2026/05/23/fanvue-joel-payne-200-million-arr-youtube-bankruptcy-creator-economy/ ·
https://sacra.com/c/fanvue/

## Build recommendation (priority order)

1. **Fanvue official adapter** — sanctioned OAuth2, real value, no ToS risk. First.
2. **Reddit official adapter** — OAuth2 post+DM; surface NSFW-read + key-approval caveats.
3. **OnlyFans / Fansly gateway adapter** — implement against a chosen gateway's
   documented API; user supplies provider + keys (env only); `capabilities()`
   greys out unsupported actions. User accepts ToS/ban risk.
4. **MYM / ManyVids / SextPanther / Hidden / LoyalFans / FeetFinder** — CSV/manual.

All four routes sit behind the same `LiveApiClient` contract — no dashboard rework
when a backend is added.
