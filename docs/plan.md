# Transend MVP build plan

Source: [docs/prd.md](prd.md) (PRD v2, Nov 13, 2026). The v1 dates no longer hold; the order below is what matters.
Each milestone works on testnet before the next starts. "Nice to have" and "stretch" items come only after every acceptance criterion passes.

Two tracks build in parallel (see the PRD's "How to read this document"): **Core** owns `contracts/`, `scripts/`, `web/lib/`, `web/app/api/`, `web/app/admin/api/`, `web/db/`; **UI** owns `web/styles/`, `web/components/`, `web/strings/` values and the look of `web/app/**/page.tsx`.

## Status

| # | Milestone | Track | State |
|---|---|---|---|
| 1 | Contract, tests, deploy | Core | Done (v1) |
| 1b | Contract v2: Savings, no duress, redeploy | Core | Done: 37 tests, redeployed as `CA5VT3QZ...` |
| 2 | App shell and screens | UI + Core | Core done (auth, database, view-models). UI track (Draft A restyle, U1 to U8) not started |
| 3 | Wire API to contract | Core | Done |
| 3b | Trained forecast | Core | Done (on synthetic data) |
| 4 | End-to-end demo works | Both | Done locally against testnet; live URL waits on the Vercel environment variables |
| 5 | Polish, README, cards | Both | Not started (Playwright test, `docs/technical.md`, printed cards, Slow 3G check, UI pass) |
| 6 | Stretch | Core | Not started |

## Milestone 1b: Contract v2 (done)

| PRD section | Files | What |
|---|---|---|
| Savings storage, functions, events, errors | `contracts/transend_escrow/src/{lib,types}.rs` | `SavingsConfig`; card `staked`, `yield_credited`, `stake_updated`; `stake`, `unstake`, `accrue`, `liquid_balance`, `staked_balance`, `savings`; admin `set_apy`, `fund_yield_reserve`, `pause_staking`, `unpause_staking`, `set_speedup`, `set_savings_limits`; events `stake`, `unstake`, `yield`; errors 18 to 21 |
| Redeem and refund on liquid balance only; renewal carries the staked amount | same | `InsufficientLiquid` |
| Tests 9 to 12 | `contracts/transend_escrow/src/test.rs` | 10 new tests (37 total) |
| Redeploy | `scripts/deploy-testnet.ts` | Always rebuilds, passes Savings settings, funds a US$1,000 yield reserve |
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
| Savings API | `web/lib/savings/rules.ts`, `web/lib/server/savings.ts`, `web/app/api/cards/[id]/{savings,stake,unstake}` |
| Sender view-models, inbox | `web/lib/server/views.ts`, `web/app/api/{me,inbox}` |
| Rate limits (redeem, balance, auth) | `web/lib/server/ratelimit.ts` (Postgres-backed) |
| Admin API | `web/app/admin/api/{cards,areas,shops,savings,forecast}` |
| Client layer used by the screens | `web/lib/client/{api,sender,shop}.ts` |
| Screens wired (markup kept for the UI track) | sender, shop, `/proof` (Savings panel), `/admin/{cards,areas,cash,savings}` |
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

## Milestone 4: end to end (done locally)

Run on the local app against testnet on Nov 13, 2026. Every criterion below passed in the browser or against the API, except where noted.

| # | Criterion | Result |
|---|---|---|
| 1 | Contract deployed, ID in README and `/proof`, tests pass | Pass (37 tests) |
| 2 | Deploy and seed in one command each | Pass (`npm run deploy:testnet`, `npm run seed:demo`) |
| 3 | Sign up, add recipient, card PDF; sanctioned name refused | Pass (sender and recipient) |
| 4 | Shop asks, sender approves, PIN set | Pass |
| 5 | Quote shown; expired quote and under C$100 refused | Pass (C$1.49, 0.6921, US$137.39, 2.945%) |
| 6 | Deposit moves USDC, balance updates | Pass |
| 7 | Redeem pays the shop, "Pay US$X" within 10 s | Pass (2 to 6 s) |
| 8 | Used line, wrong PIN, over limit, third withdrawal declined | Pass |
| 9 | Tense drops to US$50; closed declines all | Pass |
| 10 | `/admin/cash`: band, ceiling, restock, "Sample data", forecaster | Pass |
| 11 | Set aside and move back; shop sees only available; redeem above available declined; floor refused | Pass |
| 12 | Yield accrues (demo clock), capped by reserve, events linked | Pass |
| 13 | Inbox shows pickup and reply | Pass |
| 14 | Only the sponsor pays fees | Pass at runtime: every transaction is fee-bumped; sender and shop accounts hold 0 XLM. The issuer, admin and verifier hold Friendbot XLM from the deploy script |
| 15 | Every transaction links to stellar.expert | Pass |
| 16 | 360 px and Slow 3G | 360 px pass (PIN pad fits, 48 px keys). Slow 3G not yet checked (milestone 5). Shop JS about 140 KB gzipped for modern browsers |
| 17 | Draft A UI | Not started (UI track) |
| 18 | Playwright test | Not started (milestone 5) |

**Live URL:** waits on the production environment variables in Vercel (see README, "Deploy").

## Deviations from the PRD (decided while building)

- **Admin API path:** `/admin/api/*`, not `/api/admin/*`, so the admin password (HTTP Basic on `/admin/`) covers it.
- **Contract bindings:** a small hand-written typed wrapper (`web/lib/stellar/escrow.ts`) instead of generated bindings.
- **15 printed cards for "one demo sender":** the contract allows 3 cards per sender, so bulk cards are spread over demo senders `print-1@transend.demo`, `print-2@...`, 3 each.
- **Mock vault:** setting money aside moves no USDC; it stays in the escrow and only the books move. Yield is real USDC from the admin-funded reserve.
- **Training history:** the model trains on 240 days of synthetic history (the dashboard shows 60) and is tested on the last 14 days of each shop.
- **Redeem amount (open question 5 in v1):** the verification service signs only the amount the shop entered, which the recipient saw on the hand-over screen.

## Next (milestone 5, then 6)

1. Vercel production environment variables, then verify every criterion on the live URL.
2. Playwright end-to-end test, including one set-aside and move-back.
3. `docs/technical.md`, `docs/architecture.png`, README polish.
4. 15 printed demo cards (`npm run seed:demo -- --cards 15` or `/admin/cards`).
5. Slow 3G check; UI track U1 to U8.
6. Stretch: renewal flow in the app, `scripts/aml-flags.ts`, auto-move-back, SMS mode.
