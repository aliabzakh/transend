# transend

Remittance from Canada to Haiti for recipients with no bank account and no smartphone. A sender funds a Soroban escrow on Stellar **testnet**; the recipient scratches a one-time code off a printed card; a shopkeeper redeems it with the recipient's PIN; the escrow pays the shop in USDC.

> **Testnet demo. No real money.**

<!-- CONTRACT_ID -->
**Contract ID (testnet):** [`CDOBKIGCORYPODXY2BIDNBV26JG6VG4CLV6KU4FAQR7CTKZ4KQI3KK5U`](https://stellar.expert/explorer/testnet/contract/CDOBKIGCORYPODXY2BIDNBV26JG6VG4CLV6KU4FAQR7CTKZ4KQI3KK5U)
<!-- /CONTRACT_ID -->

## Status

| Milestone | State |
|---|---|
| 1. Contract, tests, deploy | Done: 27 unit tests pass, deployed to testnet |
| 2. App shell and screens | Not started |
| 3. Wire API to contract | Not started |
| 4. End-to-end demo | Not started |

Plan: [docs/plan.md](docs/plan.md). Product spec: Transend MVP PRD.

## Setup

Requires Rust (with the `wasm32v1-none` target), the Stellar CLI, and Node 20+.

```bash
cargo test -p transend_escrow      # contract unit tests
stellar contract build             # builds the wasm
cp .env.example .env
npm install
npm run deploy:testnet             # issues demo USDC, deploys the escrow, writes IDs to .env
```

`deploy-testnet.ts` creates testnet-only keys and funds them with Friendbot. Secrets go to `.env` only (gitignored).

## Contract notes

- One contract, `transend_escrow`, holds every card's USDC. It pays a shop only when a valid unused code arrives with the verification service's signature.
- Code hash: `sha256(card_id ascii || line as u32 big-endian || code ascii)`. The renewal code is line 20.
- `freeze(card_id, caller)` takes the caller explicitly (verifier or the card's sender) so either can sign; the PRD listed only `card_id`.
- PINs, the duress PIN and area risk levels live off-chain. The contract enforces the hard caps.

## What is mocked

Sender KYC, sanctions screening, CAD to USDC on-ramp, the licensed Haitian payout partner, SMS. See the PRD scope table.
