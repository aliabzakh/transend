# transend

Remittance from Canada to Haiti for recipients with no bank account and no smartphone. A sender funds a Soroban escrow on Stellar **testnet**; the recipient scratches a one-time code off a printed card; a shopkeeper redeems it with the recipient's PIN; the escrow pays the shop in USDC.

> **Testnet demo. No real money.**

<!-- CONTRACT_ID -->
**Contract ID (testnet):** [`CA5VT3QZNJXHWKRWTODIQUANZG2LERIPZNPYXNQWKKL3NTTMHCODBMIT`](https://stellar.expert/explorer/testnet/contract/CA5VT3QZNJXHWKRWTODIQUANZG2LERIPZNPYXNQWKKL3NTTMHCODBMIT)
<!-- /CONTRACT_ID -->

## Status

| Milestone | State |
|---|---|
| 1. Contract, tests, deploy | Done |
| 1b. Contract v2 (Savings, no duress) | Done: 37 unit tests pass, redeployed to testnet |
| 2. App shell and screens | Core done (auth, database, view-models). Draft A restyle (UI track) not started |
| 3. Wire API to contract | Done: every screen runs on the real API and the testnet contract |
| 3b. Trained forecast | Done, on synthetic sample data |
| 4. End-to-end demo | Done: works locally and on the live URL against testnet |
| 5. Polish (Playwright, technical doc, printed cards, Slow 3G) | Not started |

Plan, acceptance results and deviations: [docs/plan.md](docs/plan.md). Product spec: [docs/prd.md](docs/prd.md) (v2).

**Live URL:** https://transend.vercel.app

## Try the demo

- Sender app `/app`: log in as `jean@transend.demo` (password `transend-demo`), or create an account. Jean sends to Odette Pierre, card `TS4F2K9Q`.
- Shop app `/shop`: shop code `S-101`, `S-102` or `S-201`, password `transend-shop`.
- Redeem: on the shop, Pay out, then card ID, line number, the 12-character code from the printed card, and an amount up to the limit. Hand over the phone; the recipient enters her PIN (demo card: `1234`).
- Judges' page `/proof`: contract ID, the last 20 contract events with stellar.expert links, and the Savings state. No log-in.
- Admin `/admin/cards`, `/admin/areas`, `/admin/cash`, `/admin/savings`: protected by `ADMIN_PASSWORD`.

Card codes exist only in the printed card (the PDF downloaded once when the card is made); the server keeps only their hashes.

## Run locally

```bash
cp .env.example .env && npm install && (cd web && npm install)
npm run deploy:testnet          # contract, demo USDC, yield reserve; writes IDs to .env
cd web && npm run db:migrate && cd ..
npm run seed:demo               # shops, Jean, card TS4F2K9Q, sample payouts; codes go to demo-cards/
cd web && npm run dev           # http://localhost:3000
```

Tests: `cargo test -p transend_escrow` (contract) and `cd web && npm test` (cards, Savings rules, forecast). Forecast model: `npm run ml:setup && npm run ml:export && npm run ml:train`.

## Deploy (Vercel)

Vercel builds `web/` from `main`. Import `vercel.env` (made locally from `.env`, never committed) under Project Settings, Environment Variables, for Production. It points `DATABASE_URL` at Neon. The nightly forecast runs from `web/vercel.json`.
