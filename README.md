# transend

Remittance from Canada to Haiti for recipients with no bank account and no smartphone. A sender funds a Soroban escrow on Stellar **testnet**; the recipient scratches a one-time code off a printed card; a shopkeeper redeems it with the recipient's PIN; the escrow pays the shop in USDC.

> **Testnet demo. No real money.**

<!-- CONTRACT_ID -->
**Contract ID (testnet):** [`CA5VT3QZNJXHWKRWTODIQUANZG2LERIPZNPYXNQWKKL3NTTMHCODBMIT`](https://stellar.expert/explorer/testnet/contract/CA5VT3QZNJXHWKRWTODIQUANZG2LERIPZNPYXNQWKKL3NTTMHCODBMIT)
<!-- /CONTRACT_ID -->

## Status

| Milestone | State |
|---|---|
| 1. Contract, tests, deploy | Done: 27 unit tests pass, deployed to testnet |
| 2. App shell and screens | Done on fake data: sender app, shop app, `/proof`, admin pages (no database or API yet) |
| 3. Wire API to contract | Not started |
| 4. End-to-end demo | Not started |

Plan: [docs/plan.md](docs/plan.md). Product spec: Transend MVP PRD.

## Run the clickable demo (stage 1, fake data)

```bash
cd web && npm install && npm run dev
```

Open http://localhost:3000. Sender app `/app`, shop app `/shop`, judges' page `/proof`, admin `/admin/cards` (set `ADMIN_PASSWORD` to protect it; it is closed in production without one).

Demo card `TS4F2K9Q`: normal PIN `1234`, duress PIN `4321`. Open the sender app, go to the card, and use "Download card" to see its codes. The sender and shop apps do not talk to each other yet; both run on in-browser fake data until the API is wired up (milestone 3).
