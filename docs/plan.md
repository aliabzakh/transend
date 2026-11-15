# Transend MVP build plan

Source: [docs/prd.md](prd.md) (PRD v2, Nov 13, 2026). The v1 dates no longer hold; the order below is what matters.
Each milestone works on testnet before the next starts. "Nice to have" and "stretch" items come only after every acceptance criterion passes.

Two tracks build in parallel (see the PRD's "How to read this document"): **Core** owns `contracts/`, `scripts/`, `web/lib/`, `web/app/api/`, `web/app/admin/api/`, `web/db/`; **UI** owns `web/styles/`, `web/components/`, `web/strings/` values and the look of `web/app/**/page.tsx`.

## Status

| # | Milestone | Track | State |
|---|---|---|---|
| 1 | Contract, tests, deploy | Core | Done (v1) |
| 1b | Contract v2: no duress, redeploy | Core | Done: 27 tests, redeployed as `CCNJKUOE...` |
| 2 | App shell and screens | UI + Core | Done: Core (auth, database, view-models) and UI U1 to U7 (Draft A restyle, branch `ui/draft-a`). U8 (accessibility pass) is milestone 5 |
| 3 | Wire API to contract | Core | Done |
| 3b | Trained forecast | Core | Done (on synthetic data) |
| 4 | End-to-end demo works | Both | Done, locally and on https://transend.vercel.app (Neon database) |
| 5 | Polish, README, cards | Both | Not started (Playwright test, `docs/technical.md`, printed cards, Slow 3G check, UI pass) |
| 6 | Stretch | Core | Not started |

## Milestone 1b: Contract v2 (done)

| PRD section | Files | What |
|---|---|---|
| Redeploy | `scripts/deploy-testnet.ts` | Always rebuilds |
| Duress removed | contract comments | |

## Milestones 2 (Core) and 3: wire the API to the contract (done)

All Stellar calls sit behind `web/lib/stellar/`; apps never build transactions.

| Area | Files |
|---|---|
| Database (Drizzle, Postgres) | `web/db/schema.ts`, `web/db/migrations/`, `web/db/migrate.ts` |
| Stellar: simulate, sign, sponsor fee-bump, submit; reads; zero-XLM sponsored accounts | `web/lib/stellar/{network,submit,accounts,escrow}.ts` |
| Secrets: AES-GCM custodial keys, argon2id PIN (salt + pepper), sessions | `web/lib/server/{secrets,pin,session,env}.ts` |
| Auth, mocked KYC, sanctions mock | `web/lib/server/senders.ts`, `web/app/api/auth/*` |
| Recipients (open departments), cards (20 codes, renewal code, `issue_card`, PDF once), approve, freeze | `web/lib/server/cards.ts`, `web/lib/cards/*`, `web/app/api/{recipients,cards}` |
| Quote (30 s firm) and send (C$900 a day, C$2,000 a month) | `web/lib/server/transfers.ts`, `web/app/api/{quote,send}` |
| Shops: log-in, area status, activation request, PIN set-up | `web/lib/server/shops.ts`, `web/app/api/{shop,areas,cards/[id]/*}` |
| Verification service: PIN, area, cash ceiling, verifier-signed redeem, 5-wrong-PIN freeze, balance, replies | `web/lib/server/verify.ts`, `web/app/api/{redeem,balance,messages}` |
| Sender view-models, inbox | `web/lib/server/views.ts`, `web/app/api/{me,inbox}` |
| Rate limits (redeem, balance, auth) | `web/lib/server/ratelimit.ts` (Postgres-backed) |
| Admin API | `web/app/admin/api/{cards,areas,shops,forecast}` |
| Client layer used by the screens | `web/lib/client/{api,sender,shop}.ts` |
| Screens wired (markup kept for the UI track) | sender, shop, `/proof`, `/admin/{cards,areas,cash}` |
| Seed | `scripts/seed-demo.ts`, `web/lib/server/demo.ts` |

## Milestone 3b: trained forecast (done)

| Item | Files |
|---|---|
| Synthetic sample data ("Sample data" everywhere) | `web/lib/risk/sample.ts`, `web/lib/risk/seed.ts` |
| Features and rules baseline, shared by training and scoring | `web/lib/risk/features.ts` |
| Training: gradient-boosted quantile regression (p10, p50, p90), exported as JSON | `scripts/ml/export-samples.ts`, `scripts/ml/train_forecast.py`, `web/lib/risk/model.json` |
| Live scoring in pure TypeScript, fallback to rules | `web/lib/risk/{model,forecast}.ts` |
| Forecast service, nightly cron, dashboard | `web/lib/server/forecast.ts`, `web/app/api/cron/forecast`, `web/vercel.json`, `/admin/cash` |
| Tests | `web/lib/risk/forecast.test.ts` |

Result on held-out days (last 14 per shop, synthetic): model MAE US$21.31 vs rules US$58.03 (63% better), so the model is used when `FORECAST_MODEL_MODE=model`.

## Milestone 4: end to end (done)

Run on the local app against testnet on Nov 13, 2026. Every criterion below passed in the browser or against the API, except where noted.

| # | Criterion | Result |
|---|---|---|
| 1 | Contract deployed, ID in README and `/proof`, tests pass | Pass (27 tests) |
| 2 | Deploy and seed in one command each | Pass (`npm run deploy:testnet`, `npm run seed:demo`) |
| 3 | Sign up, add recipient, card PDF; sanctioned name refused | Pass (sender and recipient) |
| 4 | Shop asks, sender approves, PIN set | Pass |
| 5 | Quote shown; expired quote and under C$100 refused | Pass (C$1.49, 0.6921, US$137.39, 2.945%) |
| 6 | Deposit moves USDC, balance updates | Pass |
| 7 | Redeem pays the shop, "Pay US$X" within 10 s | Pass (2 to 6 s) |
| 8 | Used line, wrong PIN, over limit, third withdrawal declined | Pass |
| 9 | Tense drops to US$50; closed declines all | Pass |
| 10 | `/admin/cash`: band, ceiling, restock, "Sample data", forecaster | Pass |
| 11 | Inbox shows pickup and reply | Pass |
| 12 | Only the sponsor pays fees | Pass at runtime: every transaction is fee-bumped; sender and shop accounts hold 0 XLM. The issuer, admin and verifier hold Friendbot XLM from the deploy script |
| 13 | Every transaction links to stellar.expert | Pass |
| 14 | 360 px and Slow 3G | 360 px pass (PIN pad fits, 48 px keys). Slow 3G not yet checked (milestone 5). Shop JS about 140 KB gzipped for modern browsers |
| 15 | Draft A UI | Done on `ui/draft-a` (U1 to U7); U8 pass in milestone 5 |
| 16 | Playwright test | Not started (milestone 5) |

**Live URL (checked Nov 13, 2026 after merging PR #2):** https://transend.vercel.app runs on Neon and the same testnet contract. Passed there through the API and `/proof`:

- Sender and shop log-in.
- Shop cash ceiling from the model (S-101: C$288, "Saturday market").
- Balance by PIN.
- Used-line and third-withdrawal declines.
- US$10 redeem in 5.8 s.
- C$99 refused and C$100 quote (C$1.49 fee, US$68.18, 3.69% all-in), then sent in 5 s.
- Admin pages behind the password.
- Nightly cron (3 shops recomputed).
- `/proof` listing the live events with explorer links.

The browser screens were not clicked through on the live URL; they were on the local build.

## Deviations from the PRD (decided while building)

- **Admin API path:** `/admin/api/*`, not `/api/admin/*`, so the admin password (HTTP Basic on `/admin/`) covers it.
- **Contract bindings:** a small hand-written typed wrapper (`web/lib/stellar/escrow.ts`) instead of generated bindings.
- **15 printed cards for "one demo sender":** the contract allows 3 cards per sender, so bulk cards are spread over demo senders `print-1@transend.demo`, `print-2@...`, 3 each.
- **Training history:** the model trains on 240 days of synthetic history (the dashboard shows 60) and is tested on the last 14 days of each shop.
- **Redeem amount (open question 5 in v1):** the verification service signs only the amount the shop entered, which the recipient saw on the hand-over screen.

## Next (milestone 5, then 6)

1. Click through the screens on the live URL (sender, shop, admin) at 360 px.
2. Playwright end-to-end test.
3. `docs/technical.md`, `docs/architecture.png`, README polish.
4. 15 printed demo cards (`npm run seed:demo -- --cards 15` or `/admin/cards`).
5. Slow 3G check; UI track U8 (accessibility pass).
6. Stretch: renewal flow in the app, `scripts/aml-flags.ts`, SMS mode.

## Milestone 2 (UI): Draft A restyle (done)

| Package | Files | Result |
|---|---|---|
| U1 tokens, fonts | `web/styles/tokens.css`, `web/styles/fonts.css`, `web/public/fonts/` | Night palette, Draft A type scale, pill keys, motion tokens (zeroed under reduced motion). Satoshi 400/500/700 self-hosted from the design file, accents covered, metric-matched fallback |
| U2 primitives, style guide | `web/components/ui/*`, `web/app/dev/styleguide` | Button (busy, ghost, danger), Input (error), Card, Avatar, ReplyChip, ResultMark, Meter, Skeleton; every state on `/dev/styleguide` (404 in production) |
| U3 PinPad | `web/components/ui/PinPad.tsx` | Pill keys; Back, last digit, Done on the last row; Clear by the dots; screen reader count. Scramble, auto-clear, props unchanged. Fits 360 x 640 |
| U4 sender | `web/app/(sender)/app/**` | Greeting, recipient cards, big C$ entry, quote with live bar, drawn result marks, Gold replies |
| U5 shop | `web/app/(shop)/shop/**` | Area pill control, big tiles, cash meter, Draft A hand-over screen. Loads only Satoshi 500 and 700; about 141 KB gzipped JS for modern browsers (plus a 39 KB `noModule` polyfill only old browsers load) |
| U6 forecast view | `web/components/Forecast*.tsx`, `web/app/admin/cash/*` | Band chart with hover and keyboard readout, ceiling, restock days, table; loading, empty and error states |
| U7 admin, proof, landing | `web/app/admin/**`, `web/app/proof`, `web/app/page.tsx` | Restyled; no sideways scroll at 360 px |

Microinteractions are CSS only (no motion library, so the shop budget holds): presses scale, content rises in with a short stagger, PIN dots pop, the result mark draws itself, declines shake once, waiting states breathe, meters fill. Data the screens still want is in [ui-requests.md](ui-requests.md).

