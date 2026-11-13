# Transend MVP PRD (v2)

Version 2, Nov 13, 2026. Supersedes "Transend MVP PRD" (v1, Nov 7, 2026, PDF). Owner: Ali.
Everything in v1 that is not mentioned in the change log below is unchanged.

## How to read this document (tracks)

Work is split into two tracks so two people (or two Claude sessions) can build in parallel without touching the same files. Every section is tagged:

| Tag | Meaning | Who builds it |
|---|---|---|
| **[CORE]** | Contract, API, database, risk and savings logic, scripts, auth | Core track (Ali, Sammara) |
| **[UI]** | Look, feel, components, screens, strings, fonts, assets | UI track (the friend working with Claude) |
| **[BOTH]** | Shared definition; each track builds its side | Both |

The UI track starts at the section **"UI track: design system and hand-off"**, which is self-contained and has a paste-ready brief for Claude. A UI-track person does not need to read the contract, API or risk-model sections to do their work.

## Change log (v1 to v2)

| # | Change | Where it lands |
|---|---|---|
| 1 | **AI prediction system for transactions** expanded: a per-shop cash-demand forecast that predicts payouts and sets each shop's cash ceiling and restock timing. | New section "AI prediction system"; scope, `/admin/cash`, tests updated |
| 2 | **UI is now Draft A** ("Satoshi · Night market") from the design language drafts, with **fully rounded (pill) keypad keys**. The black-and-white rule is retired. | New section "UI track: design system and hand-off"; the v1 "Design: minimal black and white" section is replaced |
| 3 | **Duress feature removed**: no duress PIN, no duress payout, no silent freeze, no duress screens or strings. | Removed throughout; see "Knock-on changes to existing code" |
| 4 | **Staking for yield** added: a sender can set part of a card's balance aside to earn yield. v1 said "Yield: None". | New section "Savings (staking for yield)"; contract, limits, API, screens, tests updated |
| 5 | **Stellar integration** listed in one place: every on-chain feature, asset, transaction path and standard, with its build status. | New section "Stellar integration" |

---

## Summary [BOTH]

Build one end-to-end cash-out flow live on Stellar testnet: a sender in Montréal funds a Soroban escrow, the recipient in rural northern Haiti scratches a one-time code off a printed card, a shopkeeper redeems it with her PIN, the escrow settles the shop in US dollars, and the sender gets a confirmation.

Transend is a remittance product for recipients with no bank account and no smartphone, starting in Haiti's Nord-Ouest, Nord and Sud departments. The recipient carries a scratch card with 20 single-use codes. Any participating corner shop pays her small amounts of US-dollar cash against the next code plus a PIN she set herself. Stellar moves the money and enforces the rules; a licensed Haitian payout partner and its shop agents are the last mile.

Haiti adds a requirement of **safety**. The product keeps little cash in any one place, makes cash movements unpredictable, and makes a stolen card or a forced withdrawal worth very little. The MVP shows this with:

- **area risk levels** that tighten limits automatically,
- **an AI cash-demand forecast** that predicts each shop's payouts and sets its cash ceiling and restock timing,
- **Savings**, which lets the sender lock part of the balance away from shop withdrawal, where it also earns yield.

Judges must be able to verify the flow themselves with a live URL, a contract ID and stellar.expert links for every transaction. Everything outside that one flow and its safety controls is a bonus. The UI follows the signed-off design language (Draft A, Night market).

The evidence behind this PRD is in Transend: Haiti Corridor Research and the Transend Unit Economics model. The product is built for the Velocity Blockchain Innovation Challenge powered by Stellar. Team: Ali and Sammara (tech), Shivan and Ali (design), Nelli (research), Sammara and Shivan (pitch).

## Scope [BOTH]

These are proposed defaults for the Haiti corridor, pending team sign-off (tracker task T004). Build against them; anything the team changes will arrive as an edit to this section.

Corridor: Canada (Montréal first) to Haiti, starting in the Nord-Ouest, Nord and Sud departments, not Port-au-Prince. That is where it is safer and where a Stellar stablecoin pilot already paid women through local vendors in 2026. The sender sees CAD; the recipient's balance and payout are in US dollars; settlement on Stellar is in USDC. The recipient never holds crypto: her balance is a US-dollar amount that a licensed Haitian partner pays out.

| Piece | MVP treatment | Why |
|---|---|---|
| Soroban escrow: deposit, redeem, balance, freeze, limits, **stake, unstake, yield**, events | Real, on testnet | The core of the demo; judges verify it by contract ID |
| One-time codes, hashed on-chain | Real | Each scratch line works once |
| PIN check (one PIN) | Real, in an off-chain verification service | The PIN is never on-chain or in plain text |
| Area risk levels that lower withdrawal limits | Real, set by the shop's one-tap status or by admin | Part of the safety story |
| **AI cash-demand forecast** per shop | Real, on `/admin/cash`. Baseline is a moving average; a trained model replaces it only if it beats the baseline on held-out sample data. Trained on **synthetic sample data**, labelled as such | Sets cash ceilings and restock timing; the shop cash ceiling is enforced at every redeem |
| **Savings (staking for yield)** | Real contract logic on testnet; the yield source is a **mock yield reserve at a labelled demo rate**, behind a vault interface that a real protocol can replace later | Lets families earn on money they are not spending, and keeps that money out of shop reach |
| Fee sponsorship (fee-bump) | Real | The shop and recipient never hold XLM |
| Quote shown before sending (SEP-38 style) | Real quote endpoint in our API, using a fixed demo CAD to USD rate | A firm, visible fee and payout before confirming |
| Cash-distribution system (forecast, per-shop cash ceiling, restock timing) | Dashboard on sample data; forecast is the AI forecast above | Safety against robbery and gang taxation |
| Sanctions screening against Canada's Special Economic Measures (Haiti) Regulations | Mocked: names checked against a small seeded list | Production uses a screening vendor |
| Sender KYC | Mocked: a "Verify identity" step that always passes | A licensed partner does this in production |
| CAD to USDC on-ramp (SEP-24) | Mocked screen; the sender wallet is pre-funded with testnet USDC | Optional stretch: a real deposit against the Stellar test anchor |
| Licensed Haitian payout partner; shops paid back into their MonCash or Fonkoze account | Mocked: the escrow pays the shop's testnet settlement account, and the UI says "Paid back to your MonCash account" | No partner signed yet |
| Video or voice call to activate a card | Mocked: a "Yes, that's her" button in the sender app | No images are stored in any version |
| SMS | Simulated inbox for the sender; a Haiti-side SMS mode is a stretch fallback | Texts to Haiti cost about US$0.29 each at Twilio's list price, and networks go down for days |
| Gourde payout (path payment to a mock HTG asset) | Stretch | Only if the partner cannot pay in US dollars |
| MoneyGram restocking | Removed | Shops buy cash from local trade and are paid back digitally, so there is no cash delivery to rob |
| ~~Duress PIN and duress payout~~ | **Removed in v2** | Small withdrawal caps and Savings cover coercion instead |

**Must have:** the end-to-end flow (generate card, activate, fund, redeem code + PIN, escrow settles shop, confirmation), area risk levels that lower the withdrawal limit, the shop cash ceiling, and Savings (set aside, move back, yield shown), all live on testnet at a public URL, with a README holding the contract ID.

**Nice to have, in this order:** the cash-distribution dashboard with the AI forecast, the trained forecast model, card renewal (the last line on the card), the AML flag script, auto-move-back from Savings when a redeem needs it, Kreyòl and French UI for the shop app, SMS mode, a real SEP-24 deposit, a real lending protocol as the yield source, gourde payout.

**Out of scope:** a recipient app (she has no phone), real KYC, real money, mainnet, native mobile apps, Port-au-Prince and the Ouest, Artibonite and Centre departments at launch, large language models anywhere in the money path, the investor-funded advance pool (Transend's own treasury funds shop cash in the pilot), and the future prepaid Visa idea.

## Limits [CORE]

The contract stores US-dollar amounts as USDC base units; CAD equivalents use USD/CAD 1.413 from the model; all settable by admin.

| Limit | Value | Reason |
|---|---|---|
| Max card balance (principal plus yield, liquid plus set aside) | US$635 (about C$900) | Keeps each card a low-value product, below FINTRAC's C$1,000 prepaid-account line |
| Max loaded onto one card per 24 hours | US$635 | Stops load, withdraw, load again from moving over C$1,000 through one card in a day |
| Max sent per sender per 24 hours, all cards together | C$900 | Keeps a sender's daily total under C$1,000 |
| Max sent per sender per month | C$2,000 | Caps exposure per verified identity |
| Minimum top-up | C$100 | Below this the flat fee pushes the family's cost well past 3% |
| Max per withdrawal | US$100; US$50 when the area risk level is "tense" | Small amounts are safer to carry home and cheaper to lose |
| Max withdrawals per card per day | 2 | Limits the damage from a stolen card and PIN |
| Max recipients (cards) per sender | 3 | Makes mule patterns visible |
| Max senders per card | 2 | Flags many senders paying one card |
| Cash held per shop | C$500 to start, then set by the AI forecast (never above an admin hard cap) | A robbery finds little |
| **Min amount to set aside (Savings)** | **US$10** | Avoids dust |
| **Min liquid left after setting aside** | **US$100** (one max withdrawal) | She can always collect a full withdrawal without moving money back first |
| **Max set aside, all cards together** | **US$5,000 on testnet** (admin) | Caps exposure to the yield source |
| **Demo yield rate** | **4.00% a year**, admin-set, labelled "demo rate, not guaranteed" | Never presented as a real return |

Removed in v2: the US$20 duress payout.

These limits reduce risk; they do not replace KYC. Haiti is on the FATF grey list, so every sender is fully verified and every person and shop is screened against Canada's Haiti sanctions list (see Security and compliance).

Price and cost target: a flat fee F of C$1.49 plus an FX markup m of 2.2%, paid out in US dollars. From Canada today the average is 5.78%, and cash paid at an agent costs 8.55 to 9.06% (World Bank RPW, Q3 2025). With transfer amount A: all-in cost = F/A + m = 1.49/200 + 2.2% = 2.945% (at most 3%). At C$200 Transend keeps about C$1.27 per top-up after costs in the model's base case. Several inputs are assumptions (0.5% partner payout cost, 1% shop commission), so if safety costs run higher, the fallback price is C$1.99 + 2.5% (3.495%), still well under every cash option. Savings does not change this price: in the MVP all yield goes to the family (see Savings).

## Users and the end-to-end flow [BOTH]

Three people touch the product, and only two of them use a screen.

| User | Device | What they need |
|---|---|---|
| Sender (Haitian-Canadian, works in Montréal) | Smartphone, mobile web, French or English | Send once a month, see the exact fee and the dollars she will get, know each time she collects, know she is not carrying a lump of cash home, and let spare money grow |
| Recipient (lives in a mountain commune in the Nord-Ouest) | None; a printed scratch card. May not have a valid national ID | Small amounts of cash close to home, without anyone seeing her collect a large sum |
| Shopkeeper (runs a small boutik and is already a MonCash agent) | Low-end Android phone, 2G or 3G, frequent network outages | Earn at least what MonCash pays, get paid back the same day into the account she already has, never hold much cash, and put no sign on the door |

The demo flow, in order:

1. **Sign up.** The sender creates an account, passes the mocked KYC step, and their name is screened against the mock sanctions list.
2. **Add a recipient.** Name, relationship, commune and department. Only the Nord-Ouest, Nord and Sud are open. The recipient's name is screened too.
3. **Issue a card.** The system generates a secret card seed, 20 one-time codes and a renewal code, stores only their hashes in the contract, and outputs a printable card (PDF). The card shows a non-secret card ID and picture steps, looks like a phone-credit card, and never shows the balance.
4. **Activate at a shop.** The shopkeeper enters the card ID. The sender gets an activation request and taps "Yes, that's her". On the shop's phone, using a scrambled keypad, the recipient sets **one** 4-digit PIN (entered twice). Whether the partner records an ID she does have is an open question for the partner.
5. **Send money.** The sender enters an amount (C$100 or more) and sees a quote: the C$1.49 fee, the rate with its 2.2% markup, and the US dollars the recipient will get. On confirm, testnet USDC moves from the sender into the escrow under that card.
6. **Redeem.** The recipient scratches the next line. The shopkeeper types the code and the US-dollar amount, then hands the phone over. The hand-over screen shows the amount she is approving. The recipient enters her PIN.
7. **Checks.** The verification service checks the PIN, the area's risk level (the lower limit if "tense", no payouts if "closed") and the shop's cash ceiling for the day.
8. **Settle.** The contract checks the code, available balance and limits, then pays the shop's settlement account in USDC. That stands in for the partner paying the shop back into its MonCash or Fonkoze account. The fee is sponsored.
9. **Confirm.** The shop sees "Approved, pay US$X". The sender sees "[Recipient's name] has the money" in the app and in the simulated SMS inbox. The recipient can send a preset reply: "Received, thank you", "All is well" or "Please call me".
10. **Grow (optional).** The sender sets part of the balance aside in Savings. It earns at the demo rate and cannot be collected at a shop until the sender moves it back.
11. **Repeat or renew.** Each line works exactly once. Balance checks use the card ID plus PIN at any shop and show only what she can collect now. The last line renews the card onto a fresh one and carries the balance (including anything set aside) over (nice to have).

## Architecture [CORE]

The contract is the only place family money sits (the optional vault holds set-aside funds on the contract's behalf; see Savings); the backend never holds family funds, it only checks PINs, scores risk, signs as the verifier and pays network fees.

The shop never talks to Stellar directly: it sends the code and PIN to the verification service, which signs the redeem call that the escrow checks and pays out. Dashed items in the architecture diagram are drawn for judges but mocked in the build.

### Soroban escrow contract

One contract, `transend_escrow`, written in Rust with soroban-sdk, holds every card's USDC on Transend's side and pays a shop only when a valid unused code arrives with the verification service's signature.

**Storage**

- Instance: `admin: Address`, `usdc: Address` (the testnet USDC Stellar Asset Contract), `verifier: Address`, `paused: bool`, `limits: Limits { max_balance, max_daily_load, max_withdrawal, max_withdrawals_per_day, max_cards_per_sender, max_senders_per_card }`, and **new:** `savings: SavingsConfig { vault: Address, apy_bps: u32, min_stake, min_liquid, max_staked_total, staked_total, yield_reserve: i128, speedup: u32, staking_paused: bool }`.
- Persistent, per card (key `Card(card_id)`): `sender`, `funders: Vec<Address>` (at most `max_senders_per_card`), `status: Pending | Active | Frozen | Retired`, `balance: i128` (**total**: liquid plus set aside), code_hashes (exactly 20), `used: u32` (bitmask), `renewal_hash`, `day`, `loaded_today`, `withdrawals_today`, and **new:** `staked: i128`, `yield_credited: i128`, `stake_updated: u64` (ledger time of the last accrual).
- Persistent, per sender: `SenderCards(sender) -> u32`.

`card_id` is the non-secret ID printed on the card, a Symbol such as `TS4F2K9Q`. Amounts are USDC base units (7 decimals). Extend the TTL of each card entry on every write.

**Liquid balance** is `balance - staked`. Redeem can only draw on liquid balance.

The area risk level, the lower "tense" withdrawal limit, and the shop cash ceilings live off-chain in the verification service, which must sign every redeem. The contract enforces the hard caps.

**Codes:** each line's code is 12 characters of Crockford base32 (60 bits), printed in groups of four. The stored hash is `sha256(card_id || line as u32 big-endian || code)`. The long code makes offline guessing against the public hashes impractical, and every redeem still needs the PIN check and the verifier's signature.

**Functions**

| Function | Who must sign | Checks | Effect |
|---|---|---|---|
| `__constructor(admin, usdc, verifier, limits)` | deployer | none | Stores config |
| `issue_card(sender, card_id, code_hashes, renewal_hash)` | the card's sender | card_id unused; 20 hashes; sender under `max_cards_per_sender` | New card, status Pending; sender added to funders |
| `activate(card_id)` | the card's sender | status Pending | Status Active ("Yes, that's her") |
| `deposit(card_id, from, amount)` | `from` | not paused; Active or Pending; amount > 0; `from` already a funder or funders below `max_senders_per_card`; today's loads + amount at most `max_daily_load`; balance + amount at most `max_balance` | USDC `from` to contract; balance += amount |
| `redeem(card_id, line, code, amount, shop)` | verifier | not paused; Active; line < 20 and unused; hash matches; amount at most `max_withdrawal` and at most **liquid balance**; withdrawals today < `max_withdrawals_per_day` | Marks line used; USDC contract to shop; balance −= amount |
| `freeze(card_id, caller)` | verifier or the card's sender | Active | Status Frozen (lost card, five wrong PINs, or the sender's choice) |
| `unfreeze(card_id)` | the card's sender | Frozen | Status Active |
| `balance(card_id) -> i128` | none (read-only) | | Total balance |
| **`liquid_balance(card_id) -> i128`** | none (read-only) | | Balance minus set-aside |
| **`staked_balance(card_id) -> i128`** | none (read-only) | | Amount set aside |
| **`stake(card_id, amount)`** | the card's sender | not paused; staking not paused; status Active or Frozen-not-allowed (Active only); amount at least `min_stake`; liquid after at least `min_liquid`; `staked_total + amount` at most `max_staked_total` | Settles accrued yield; moves amount into the vault; `staked += amount` |
| **`unstake(card_id, amount)`** | the card's sender | amount at most staked; works when Active or Frozen, and while paused | Settles accrued yield; pulls amount back from the vault; `staked -= amount` |
| **`accrue(card_id)`** | anyone | staked > 0 | Credits yield to balance, limited by `yield_reserve`; see formula below |
| `renew(card_id, renewal_code, new_card_id, new_code_hashes, new_renewal_hash)` | verifier | renewal hash matches; old card Active | New card Active with the old balance **and the old staked amount**; old card Retired (nice to have) |
| `refund(card_id, amount)` | the card's sender | card exists; not paused; amount at most **liquid** balance | USDC back to the sender, for a lost card (nice to have). Set-aside funds must be moved back first |
| `pause()`, `unpause()`, `set_limits()`, `set_verifier()` | admin | | Admin controls |
| **`set_apy(bps)`, `fund_yield_reserve(amount)`, `pause_staking()`, `unpause_staking()`, `set_speedup(n)`** | admin | | Savings controls |

**Yield formula.** Per card, on every accrual:
`yield = staked * apy_bps / 10_000 * elapsed_seconds * speedup / 31_536_000`
`yield` is capped at `yield_reserve`, subtracted from the reserve, and added to `balance` (and `yield_credited`). If the reserve is empty, accrual simply pays nothing; it never mints and never fails a redeem. `speedup` is 1 in normal use; it can be raised **for the demo video only** so yield is visible in seconds, and `/proof` shows it whenever it is not 1.

**Events** (they feed the AML script, the cash-distribution dashboard and the activity feed): `issue`, `activate`, `deposit` (from, amount, new balance), `redeem` (line, amount, shop, new balance), `freeze`, `unfreeze`, `renew`, `refund`, `pause`, **`stake` (amount, new staked), `unstake` (amount, new staked), `yield` (amount, new balance)**. The topic is the event name plus `card_id`. The freeze event carries no reason, so the public ledger never shows why a card was frozen.

**Errors:** a `#[contracterror]` enum with `NotFound`, `AlreadyExists`, `NotActive`, `Frozen`, `Paused`, `BadLine`, `CodeUsed`, `BadCode`, `OverWithdrawalLimit`, `TooManyWithdrawals`, `OverDailyLoad`, `OverBalanceLimit`, `InsufficientBalance`, `TooManyCards`, `TooManySenders`, `BadInput`, and **new:** `StakingPaused`, `BelowMinStake`, `OverStakeLimit`, `InsufficientLiquid`.

**Unit tests** (`cargo test`, all required):

1. A valid code redeems once and pays the shop; the same code is then rejected with `CodeUsed`
2. A wrong code is rejected with `BadCode`, and nothing moves
3. Over-withdrawal, a third withdrawal in one day, over-daily-load and over-balance are each rejected
4. A third funding address on one card is rejected with `TooManySenders`
5. Redeem without the verifier's signature fails; deposit without `from`'s signature fails
6. A Pending or Frozen card cannot be redeemed; only the sender can unfreeze; a paused contract rejects deposit and redeem
7. After renewal the old card rejects every call except `balance`, and the new card carries the balance
8. The daily counters reset on the next ledger day
9. **Stake and unstake: only the sender can sign; below `min_stake`, above the liquid floor, and above the total cap are each rejected; unstake works on a Frozen card and while paused**
10. **Redeem above the liquid balance is rejected even when the total balance would cover it; set-aside money is untouched by a redeem**
11. **Yield accrual matches the formula at a known elapsed time; an empty reserve pays zero and does not fail; `speedup` scales yield; yield never changes `loaded_today`**
12. **Renewal carries the staked amount; refund is limited to liquid balance**

### Off-chain services [CORE]

One backend (Next.js route handlers, TypeScript) does everything the contract shouldn't. It checks PINs, forecasts cash demand, signs as the verifier, sponsors fees, quotes rates, makes cards, screens names, sets area risk levels, runs Savings bookkeeping and simulates SMS. Its records live in Postgres.

**Accounts and keys (testnet only).** Sender and shop accounts are custodial demo keypairs created at sign-up, funded with Friendbot and given a USDC trustline. A shop's account stands in for its MonCash or Fonkoze settlement account. Secret keys are encrypted at rest with a server key from the environment. Three server keys come from environment variables: `ADMIN_SECRET`, `VERIFIER_SECRET` and `SPONSOR_SECRET`. The sponsor fee-bumps every transaction, so senders, shops and cards never need XLM. Passkey wallets (Stellar smart wallets) are a later upgrade, not MVP.

**Verification service (PIN).** The recipient sets **one** 4-digit PIN at activation. It is stored as `argon2id(PIN, per-card salt, server pepper)`. It is never on-chain, logged or kept in plain text. PINs travel only over TLS to this service. In SMS mode the PIN is sealed to the gateway's public key (libsodium sealed box), so the carrier never sees it and "no PIN is transmitted in the clear" holds.

On a redeem the service checks the PIN, checks the area's risk level (and applies the lower limit if "tense"), and checks the shop's cash ceiling. It then simulates the redeem, signs as the verifier, fee-bumps with the sponsor key, submits and returns the transaction hash. Five wrong PINs in a row freeze the card; the sender unfreezes it from the app.

**Area risk and cash service (`web/lib/risk/`).** Area risk level per commune: calm, tense or closed. The shopkeeper sets it with one tap; admin can override. "Tense" drops the per-withdrawal limit to US$50. "Closed" pauses payouts in that area and tells the shopkeeper to send people to another shop or a partner branch. Shop cash ceiling (C$500 to start): the service refuses a redeem that would take a shop's paid-out cash for the day past its ceiling, and suggests the next shop. The ceiling and restock times come from the AI forecast (next section).

## Stellar integration [CORE]

Every place the product touches Stellar, with its status on Nov 13, 2026. "Built" is in the repo today; "M3" is milestone 3 (wire API to contract); "v2" is new in this PRD.

### On-chain: the Soroban escrow (`transend_escrow`)

| Feature | What it does on Stellar | Status |
|---|---|---|
| Escrow contract | One Soroban contract holds every card's USDC; deployed to testnet (`CDOBKIGCORYPODXY2BIDNBV26JG6VG4CLV6KU4FAQR7CTKZ4KQI3KK5U`) | Built, 27 unit tests |
| `issue_card` | Registers a card with its 20 code hashes and a renewal hash | Built |
| `activate` | The sender approves the card ("Yes, that's her") | Built |
| `deposit` | USDC moves from the sender into escrow; enforces the daily-load, balance and senders-per-card caps | Built |
| `redeem` | The verifier's signature plus a valid unused code pays the shop in USDC; the line is marked used before paying, so a replay fails with `CodeUsed` | Built |
| One-time codes | `sha256(card_id ‖ line ‖ code)` stored on-chain, with a used-lines bitmask | Built |
| `freeze` / `unfreeze` | The verifier or the sender freezes; only the sender unfreezes | Built |
| Hard limits | Max balance, daily load, per-withdrawal, withdrawals per day, cards per sender, senders per card | Built |
| Admin controls | `pause`, `unpause`, `set_limits`, `set_verifier` | Built |
| Reads | `balance`, `card` | Built |
| `renew`, `refund` | Move a card's balance onto a fresh card; return balance to the sender | Built (nice to have in the PRD) |
| Storage TTL extension | Each card's entry is extended on every write so it does not expire | Built |
| Events | issue, activate, deposit, redeem, freeze, unfreeze, renew, refund, pause; the freeze event carries no reason | Built |
| Savings: `stake`, `unstake`, `accrue`, `liquid_balance`, `staked_balance` | Set-aside balance, yield from a funded reserve, redeem limited to the liquid balance | v2, not built |
| Savings admin: `set_apy`, `fund_yield_reserve`, `pause_staking`, `unpause_staking`, `set_speedup` | Demo rate, reserve, kill switch, demo clock | v2, not built |
| New events and errors | `stake`, `unstake`, `yield`; `StakingPaused`, `BelowMinStake`, `OverStakeLimit`, `InsufficientLiquid` | v2, not built |

### Assets and accounts

| Feature | Detail | Status |
|---|---|---|
| Demo USDC | The deploy script creates an issuer, issues USDC and deploys its Stellar Asset Contract (SAC) | Built |
| Friendbot funding | Testnet accounts are funded by Friendbot | Built (deploy script) |
| Admin, verifier and sponsor accounts | Three server keys from environment variables | Built (generated into `.env`) |
| Custodial sender and shop keypairs | Created at sign-up, funded with Friendbot, given a USDC trustline; secret keys encrypted at rest | M3 |
| Shop settlement account | The shop's testnet account stands in for its MonCash or Fonkoze account | M3 |
| Yield reserve | Demo USDC the admin funds into the contract | v2 |
| Circle testnet USDC | Swap in with no contract change (the token address is a constructor argument) | Stretch |

### Transactions and fees

| Feature | Detail | Status |
|---|---|---|
| Fee sponsorship | The sponsor account fee-bumps every transaction, so senders, shops and cards never hold XLM | M3 |
| Simulate, sign, submit | The backend simulates a redeem, the verifier signs, the sponsor fee-bumps, and the tx hash comes back | M3 |
| Contract bindings | `stellar contract bindings typescript` into `web/lib/contract/`; every Stellar call sits behind `web/lib/stellar/` | M3 |
| Retry safety | A dropped connection can retry a redeem without paying twice, because a used line is rejected | M3 |

### Reading the chain

| Feature | Detail | Status |
|---|---|---|
| Soroban RPC `getEvents` | Reads the contract's latest events for `/proof` | Built (`web/lib/stellar-read.ts`) |
| `/proof` page | Contract ID, the last 20 events with transaction links, network, and the Savings panel | Page built; Savings panel is v2 |
| stellar.expert links | Every transaction and the contract link to the testnet explorer | Partly built |
| Forecast inputs | Deposit and redeem events (or their database mirror) feed the cash-demand forecast | v2 |
| AML flag script | Reads `getEvents` to flag over-funded cards and redemptions over 50 km apart within 2 hours | Nice to have |
| Horizon | Account and transaction data through the SDK | M3 |

### Stellar standards and later options

| Feature | Detail | Status |
|---|---|---|
| SEP-38-style quote | Our own `/api/quote` with a firm 30-second price; it follows SEP-38's shape but is **not** a SEP-38 anchor | M3 |
| SEP-24 deposit | A real deposit against the Stellar test anchor in place of the mocked on-ramp | Stretch |
| Gourde payout | Path payment to a mock HTG asset | Stretch, only if the partner cannot pay in US dollars |
| Real lending pool as the yield source | Swap the mock vault for a Soroban lending pool (for example Blend) | Stretch; terms unverified |
| Passkey smart wallets | Replace the custodial demo keys | Later, not MVP |
| Mainnet | n/a | Out of scope |

**Not on Stellar** (off-chain in our backend, or mocked): PIN checks, the cash-demand forecast, area risk levels, the shop cash ceiling, KYC, sanctions screening, SMS and the card PDF. The contract enforces only the hard caps and never sees a PIN.

**Gaps today:** the deployed contract is the v1 build, so adding Savings means a redeploy and a new contract ID in the README and on `/proof`. Nothing in `web/` signs or submits a transaction yet; the only live Stellar code there is the read-only event fetcher.

## AI prediction system [CORE, with UI hooks]

The AI prediction system predicts **transactions before they happen**: how much cash each shop will pay out over the coming week. Transend uses that to decide how much cash each shop should hold and when it should restock. It is classical machine learning on top of a transparent rules baseline, it runs inside the API, and **no large language model is in the money path**. It never approves or refuses an individual payout.

### Design rules

1. **Hard limits always win.** The forecast sets a shop's cash ceiling only between a floor and the admin's hard cap. It never approves a payout or loosens a contract limit.
2. **Fail simple.** If the trained model errors or is missing, the rules baseline is used. Scoring is in-process: no network call and no third-party AI service.
3. **Explainable.** Every forecast comes with a one-line plain-English reason.
4. **No personal data.** Inputs are shop, card and sender IDs and transaction facts only; no names, relationships or demographic features.
5. **Honest about data.** The MVP has no real withdrawal history. The model is trained and tested on **synthetic sample data** from `scripts/seed-demo.ts`, the dashboard says "Sample data", and the pitch says the pipeline is real but the accuracy numbers are not yet real-world numbers.

### What it predicts

**Interface:** `forecastShop(shopId, horizonDays = 7) -> { day, p10, p50, p90 }[]`, plus `suggestedCeiling`, `restockWindows` and a `reason` line.
**When it runs:** nightly (a scheduled job), and on demand from `/admin/cash`.

**Inputs:**
- the shop's daily payouts (60 days of sample data in the MVP)
- the liquid balances waiting on cards that use nearby shops (money set aside in Savings is excluded, because it cannot be collected)
- expected incoming top-ups from each sender's usual cadence (a sender who tops up monthly produces a payout spike a few days later)
- the calendar: start of month, September school fees, year-end and local holidays
- day of week
- the area status history

**Baseline (must have for the dashboard):** a 7-day moving average lifted on known peaks. This is what `web/lib/risk/forecast.ts` already does.

**Trained model (nice to have):** a gradient-boosted quantile regression on the same inputs, trained offline by `scripts/ml/train_forecast.py`, exported to JSON and scored by a pure TypeScript function in `web/lib/risk/`. It replaces the baseline **only if** it beats the baseline's mean absolute error by at least 10% on the last 14 days of each shop's sample data. Otherwise the baseline stays live.

### How the prediction is used

- **Cash ceiling:** `suggestedCeiling = clamp(p90 x 1.1, floor, admin hard cap)` in C$, starting at C$500. The service refuses a redeem that would push a shop past its ceiling for the day and suggests the next shop.
- **Restock windows** that change from day to day. They come from a seeded random generator and never repeat the same hour two days running, so cash movement is not predictable.
- **A reason line** for each shop ("Higher on Friday: month start, 4 senders top up this week").
- **Dashboard (`/admin/cash`):** per shop, the forecast band (p10 to p90), the ceiling, the next restock windows, the area status, the reason line, and which forecaster is live ("Forecast: rules" or "Forecast: model"). Sample data is labelled.

### Forecast endpoints, data and tests

| Item | Detail |
|---|---|
| `GET /api/admin/forecast/:shopId` (admin) | Forecast band, ceiling, restock windows, reason line, which forecaster is live |
| Scheduled job | Recomputes every shop's forecast and ceiling nightly; `/admin/cash` has a "Recompute" button for the demo |
| Table | `forecasts` (shop, day, p10, p50, p90, ceiling, model version, created) |
| Chain | Forecasts are private and never go on-chain; they read deposit and redeem events (see "Stellar integration") |
| Env | `FORECAST_MODEL_MODE=rules` (`rules` or `model`) |

**Tests (Vitest):** the baseline matches a hand-checked moving average with peak lifts; the model is used only when it beats the baseline by 10% on held-out data; a model error falls back to the baseline; the ceiling is never above the admin cap or below the floor; restock windows never repeat the same hour on consecutive days; set-aside money is excluded from waiting balances.

## Savings (staking for yield) [BOTH]

**What it is.** The sender can set part of a card's balance aside. Set-aside money earns yield at a demo rate and **cannot be collected at a shop** until the sender moves it back. The remaining "available now" money works exactly as before. This lets a family earn on money they are not about to spend, and it also keeps that money out of reach of a robbery or forced withdrawal.

**Names.** Inside the team and the contract this is "staking". On every user-facing screen it is **"Grow"**: "Set aside to grow", "Move back", "Available now", "Growing", "Earned". No crypto words on any screen except `/proof`.

**Who decides.** Only the sender. The recipient has no phone and the shop never sees set-aside money. It is **off by default** and opt-in per card.

**Where the yield comes from.**

- **MVP (testnet):** a mock yield source. The escrow keeps the set-aside USDC itself (the `vault` address is the escrow's own treasury sub-account behind a small `Vault` interface: `deposit`, `withdraw`, `balance`) and pays yield from an admin-funded **yield reserve** at the demo rate. Principal is always backed 1:1 by USDC; yield is only paid while the reserve has funds. This is honest: judges see real contract logic and real USDC movement, and the UI labels the rate "demo rate, not guaranteed".
- **Later (stretch):** swap the mock for a real Soroban lending pool (for example Blend) by changing the `vault` address and the `Vault` adapter. Terms, risk and availability must be verified before that.

**Rules**

| Rule | Value |
|---|---|
| Who can set aside or move back | The card's sender only |
| Minimum to set aside | US$10 |
| Minimum liquid left after setting aside | US$100 |
| Maximum set aside across all cards | US$5,000 on testnet |
| Move back | Any amount up to what is set aside; instant on testnet; allowed on a Frozen card and while the contract is paused |
| Redeem | Draws only on available (liquid) money |
| Shop balance check | Shows only "Available now" |
| Yield | Accrues continuously, credited to the card's balance on any stake, unstake or accrue call; all of it goes to the family in the MVP (Transend takes no cut; open question) |
| Caps | The US$635 balance cap counts principal plus yield, liquid plus set aside. Yield is not a "load", so it never counts toward the daily load limit. If yield lifts a card above the cap, new deposits wait until it is below |
| Demo clock | `speedup` is 1 normally. For the video it may be raised and `/proof` shows "Yield clock x N" while it is not 1 |

**How it connects to the forecast.** The cash forecast excludes set-aside money from "waiting balances", because it cannot be collected. Staking never changes the sender's daily or monthly sending limits.

**Sender experience.** Card screen shows Available now, Growing and Earned. A "Grow" screen has an amount field, a preview ("About US$X a year at the demo rate"), the liquid amount that will remain, and one button. "Move back" mirrors it. Home shows a short "Growing" line under the card.

**Risks and how the MVP handles them**

| Risk | Handling |
|---|---|
| The yield source fails or cannot pay | The MVP vault is our own mock; production only with an audited protocol; a total cap; `pause_staking`; move-back always allowed |
| The family cannot reach money she needs | The US$100 liquid floor; the sender can move back instantly on testnet; nice-to-have: auto-move-back when a redeem needs it |
| A promised return is misread as real | "Demo rate, not guaranteed" on every Grow screen; no marketing of the rate |
| Yield-bearing balances may count as investment or deposit-taking under Canadian or Haitian rules | Testnet and demo rate only in the MVP; this is a **question for the advisor** before any real launch |
| The balance cap and FINTRAC's C$1,000 prepaid-account line | Yield can lift a balance a little above US$635; confirm with the advisor whether that matters |

**API** (new): `GET /api/cards/:id/savings` (sender; available, set aside, earned, rate), `POST /api/cards/:id/stake`, `POST /api/cards/:id/unstake` (sender), `POST /api/admin/savings` (admin: set rate, fund the reserve, pause staking, set the demo clock).
**Env** (new): `DEMO_APY_BPS=400`, `MIN_STAKE_USD=10`, `MIN_LIQUID_USD=100`, `MAX_STAKED_TOTAL_USD=5000`, `DEMO_YIELD_SPEEDUP=1`.
**Tests:** the contract tests 9 to 12 above, plus Vitest for the API (only the sender can stake; a card the caller does not own is refused; amounts below minimums are refused with plain reasons; the Savings view always shows available + set aside = total).

## API endpoints [CORE]

| Endpoint | Caller | Does |
|---|---|---|
| `POST /api/auth/signup`, `/login` | sender, shop | Email + password session; mocked KYC flag and sanctions screen for senders |
| `POST /api/recipients` | sender | Adds a recipient; allows only open departments; screens the name |
| `POST /api/cards` | sender | Generates seed, 20 codes and a renewal code, calls `issue_card`, returns the card PDF once |
| `POST /api/cards/:id/activate-request` | shop | Starts activation; the sender sees an approval prompt |
| `POST /api/cards/:id/approve` | sender | Calls `activate` ("Yes, that's her") |
| `POST /api/cards/:id/pins` | shop phone | Sets the **PIN** hash |
| `POST /api/cards/:id/freeze`, `/unfreeze` | sender | Calls `freeze` or `unfreeze` |
| `GET /api/quote?amount_cad=` | sender | Fee, demo rate with markup, US$ out, quote ID, expires in 30 s; refuses under C$100 |
| `POST /api/send` | sender | Takes a quote ID; calls `deposit`; records the transfer; refuses if the sender's 24-hour total would pass C$900 or the monthly total C$2,000 |
| `POST /api/redeem` | shop | Card ID, line, code, US$ amount, PIN, then area and cash-ceiling checks, then verify, then redeem, then tx hash |
| `POST /api/balance` | shop phone | Card ID + PIN, then **available** balance in US$ |
| `POST /api/areas/:id/status` | shop, admin | Sets calm, tense or closed |
| `POST /api/messages` | shop phone | Sends a preset reply from the recipient to the sender |
| `GET /api/inbox` | sender | Simulated SMS inbox and activity, newest first |
| `GET /api/cards/:id/savings`, `POST /api/cards/:id/stake`, `/unstake` | sender | See "Savings" |
| `GET /api/admin/forecast/:shopId`, `POST /api/admin/savings` | admin | See "AI prediction system" and "Savings" |
| `POST /api/sms/inbound` | SMS gateway | Stretch: parses a text and runs the same redeem path |

**Quotes:** the demo CAD to USD rate is set in an environment variable and labelled "demo rate" in the UI, never presented as live. The fee is a flat C$1.49 plus a 2.2% markup on the rate. A quote is firm for 30 seconds and send refuses an expired one.

**Card PDF:** the card is generated with pdf-lib at credit-card or folded size, styled like a phone-credit card. It shows the card ID and a QR code holding only the card ID, 20 numbered lines with codes in groups of four, and the renewal line last. Three picture steps (scratch, hand over the phone, enter PIN) carry short labels in Kreyòl first and French second. Read the labels from a strings file and leave them as clearly marked placeholders until a native speaker supplies them. The card never shows the balance or the word "cash". Plain codes exist only in that PDF; the server keeps only the hashes. The printed card stays **one colour (black) on white** so it prints anywhere.

**SMS mode** (stretch, fallback only): a text reads `R <card_id> <line> <code> <amount> <shop_id> <sealed_pin>`, which fits in one or two SMS. The reply is `OK <amount> <tx_short>` or `NO <reason>`. SMS-mode redeems go through the same risk check; a hold is reported to the sender in Canada. Haiti-side texts are only for when data is down.

**AML flag script** (nice to have): `scripts/aml-flags.ts` reads contract events over Soroban RPC `getEvents` and prints two flags. The first is a card funded by more addresses than allowed in 30 days, a possible mule card. The second is one card redeemed at two shops more than 50 km apart within 2 hours, using shop coordinates from the database.

## Apps and screens [BOTH]

There are two mobile-first web apps in one Next.js project, plus a judges' page and admin pages. There is no recipient app. **[UI]** builds the visuals; **[CORE]** supplies the data behind each screen. Screens marked NEW are added in v2.

### Sender app (`/app`)

| Screen | Content | Primary action |
|---|---|---|
| Sign up / log in | Email, password | Create account |
| Verify identity (mock) | Name, date of birth, a fake ID upload that is not stored | Continue (always passes, unless the name is on the mock sanctions list) |
| Home | Each recipient with card status and available balance in US$; a short "Growing" line; latest activity; any alert first | Send money |
| Add recipient | Name, relationship, commune, department (Nord-Ouest, Nord, Sud) | Save |
| Card | Card ID, status (Pending, Active, Frozen, Retired), lines used out of 20, **Available now, Growing, Earned**, Download card PDF | Approve activation when a shop asks; Freeze or Unfreeze |
| **NEW Grow** | Amount to set aside or move back, the preview at the demo rate, the amount that will stay available, the "demo rate, not guaranteed" line | Set aside / Move back |
| Send | Amount in CAD (C$100 minimum), then the quote: C$1.49 fee, demo rate, US$ she gets, 30 s countdown | Send to `<name>` |
| Done | "`<Name>` has the money" after a redeem, or "Sent, waiting for pickup" after a deposit; stellar.expert link | Send more |
| Alert | A frozen card ("Please call `<name>`") | Unfreeze card |
| Inbox | Simulated SMS and preset replies from the recipient, newest first | none |

### Shop app (`/shop`)

| Screen | Content | Primary action |
|---|---|---|
| Log in | Shop code + password | Log in |
| Home | Three large buttons: Pay out, Activate card, Check balance; the area status (calm, tense, closed) as one tap at the top | n/a |
| Activate card | Card ID entry, then "Waiting for the sender to approve", then hand-over PIN setup: **PIN twice** | Activate |
| Pay out | Card ID, line number, 12-character code, amount in US$ (the current limit is shown) | Continue |
| Hand-over PIN pad | "Hand the phone to your customer"; the **amount she is approving**; masked dots; scrambled 0 to 9 keys, new order every time | Done |
| Approved | "Pay US$X" very large; card ID, line, time; "Paid back to your MonCash account"; stellar.expert link | Next customer |
| Declined | One plain reason (wrong PIN, code used, over limit, area closed, shop cash limit reached, no signal) and what to do | Try again |
| Balance | **Available now** in US$ | Done |
| Send a message | Three preset replies for the recipient to send: "Received, thank you", "All is well", "Please call me" | Send |

### Judges' page (`/proof`)
The contract ID with a stellar.expert link, the last 20 contract events with transaction links (**including stake, unstake and yield**), the network (testnet), and the Savings state: total set aside, yield reserve, demo rate and the yield clock when it is not 1. Public, no login. This is the only page that may use crypto words.

### Admin pages
- `/admin/cards` bulk-generates N demo cards for one demo sender and downloads a print-ready PDF of all of them (for the 15 physical demo cards).
- `/admin/areas` sets area risk levels and shop cash ceilings.
- `/admin/cash` is the cash-distribution dashboard on sample data: per shop, the forecast band, the cash ceiling, suggested restock times, the area status and which forecaster is live.
- **NEW `/admin/savings`**: set the demo rate, fund the yield reserve, pause staking, set the demo clock.

All admin pages are protected by an admin password from the environment.

### Shop app constraints [BOTH]

- Works on a 360 px wide screen; tap targets are at least 48 px; nothing important needs scrolling on the PIN pad.
- The shop route ships under 150 KB of JavaScript (gzipped) and stays usable on Chrome DevTools "Slow 3G", because rural Haiti is often on 2G or 3G. **Web fonts are now allowed but budgeted** (see the UI track).
- On a dropped connection it shows "Waiting for signal" and retries. A retry can never pay twice, because the contract rejects a used line.
- The PIN is never placed in a URL, log, analytics event or local storage; the pad clears itself after 60 seconds.
- All user-facing strings live in one strings file per app, English for now, so Kreyòl and French can be added without code changes.
- Code entry is by typing in the MVP; scanning a per-line QR code under the scratch strip is a stretch.

---

# UI track: design system and hand-off [UI]

This part is self-contained. It replaces v1's "Design: minimal black and white". It is written so a person can hand it to Claude and have the UI built without reading the rest of the PRD.

## What we are building

The visual identity is **Draft A, "Satoshi · Night market"** from *Transend design language drafts*: a dark green night ground, deep green cards, a bright leaf-green for the one action that matters, gold for the person being paid, Satoshi type throughout, and a paper-cut family mark.

**Source files (in the repo):** `docs/design/Transend design language drafts.html` is the **source of truth for exact values** (colours, sizes, radii, the logo SVG and the three Satoshi font files are all inside it); `docs/design/Transend design language drafts.pdf` is the same design to look at. Draft A is page 2 of the PDF. The numbers below were read from the HTML.

**Change from the draft: the keypad.** In Draft A the keys are 52 px tall with a 14 px corner radius. We want them **more rounded: fully rounded pills, like Draft C's keypad**, whose keys are the same 52 px height with a 26 px radius (half the height). So: keep Draft A's colours, type and layout, and change only the key shape to a pill. (If "like the first one" meant something else, change `--radius-key` in `tokens.css`; nothing else depends on it.)

## Design tokens

All visual values live in `web/styles/tokens.css`. Components never hard-code a colour, font, size, radius or spacing. **Keep the existing token names so current components keep working; change their values and add the new ones.**

**Colour** (hex from the draft's palette):

| Token | Value | Draft name | Used for |
|---|---|---|---|
| `--color-bg` | `#0B1A13` | Night | Page ground; the "Back" key |
| `--color-surface` | `#12291E` | Canopy | Cards, keypad keys, inputs |
| `--color-fg` | `#F3F5F0` | Off-white (Draft A's text colour) | Text, icons, filled PIN dots |
| `--color-muted` | `#A8B8AE` | n/a | Secondary text, labels (about 7.4:1 on Canopy) |
| `--color-hint` (new) | `#8FA197` | n/a | Helper lines such as "Keys move every time..." |
| `--color-line` | `#2A3D33` | n/a | Borders (phone-frame, swatch outline) |
| `--color-divider` (new) | `#24402F` | n/a | The 1 px rule inside a receipt card |
| `--color-ring` (new) | `#5E7266` | n/a | Empty PIN dot outline |
| `--color-action` (new) | `#2FCB7A` | Leaf | The one primary action, success, "go"; the "Pay out" line |
| `--color-on-action` (new) | `#0B1A13` | Night | Text and icons on Leaf (about 8.5:1) |
| `--color-action-tint` (new) | `#9FE3BE` | n/a | Text of the small label pill |
| `--color-highlight` (new) | `#E0A526` | Gold | The halo, the person being paid, replies from the recipient, the hand-over phone icon |
| `--color-on-highlight` (new) | `#3A2805` | n/a | Text on Gold (about 6.4:1) |
| `--color-warn` (new) | `#C2462B` | Clay | Warnings, stamps, destructive actions (not used in Draft A's three screens) |
| `--color-brand` (new) | `#0F5132` | Forest | Brand marks on light grounds (print); not for text on Night |
| `--color-earth` (new) | `#74491A` | Earth | Reserved for illustration; not used in MVP screens |
| `--color-paper` (new) | `#FFF7E8` | Cream | Light ground for print and deck; no light theme in the app |

**Contrast rules** (ratios computed from these values):
- Leaf on Night is about 8.5:1: fine for text and icons. Muted on Canopy is about 7.4:1 and Hint on Night about 6.6:1.
- Clay on Night is only about 3.6:1: **use Clay as a fill with off-white text on it (about 4.6:1), or for icons and large text, never for small text on Night.** Draft A does not show a warning state, so the UI person designs one with this rule (the frozen-card alert depends on it).
- Forest on Night is too low for text.
- Colour is **never the only signal**. Success and failure are also told apart by an icon and words ("Approved", "Declined: wrong PIN").

**Type**

| Token | Value |
|---|---|
| `--font-sans` | `"Satoshi", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--font-mono` | unchanged (card IDs and codes); but the card code on the hand-over screen is Satoshi 700 with tabular numerals, as in the draft |
| Weights | Display 700, Headings 500, Body 400, Numbers 500 tabular (`font-variant-numeric: tabular-nums` on every amount and code) |

Type scale used by Draft A (sizes in px; replace the old 14/16/20/28/40 scale and rename tokens to match):

| Use | Size / weight | Notes |
|---|---|---|
| Sender amount ("You send") | 48 / 700 | letter-spacing −0.02em |
| Receipt amount | 34 / 700 | centred |
| Screen title ("has her money") | 26 / 700 | letter-spacing −0.01em |
| Card code on hand-over | 22 / 700 | letter-spacing 0.06em |
| Keypad digit | 22 / 500 | |
| Button label | 17 / 700 | |
| Recipient name, instruction line | 16 / 500 | |
| Row values, small button ("Done", "Back") | 15 / 500 (Done 15 / 700) | |
| Row labels, secondary | 14 | |
| Small caption | 13 | |
| Helper line | 12 | |
| Chip label ("From Mama") | 12 / 500 | |

**Fonts.** Satoshi at weights 400, 500 and 700. The three `woff2` files (about 25 KB each) are embedded in `docs/design/Transend design language drafts.html`; extract them into `web/public/fonts/` and self-host (no third-party font requests; the shop must work on bad connections). **Check that the files cover Kreyòl and French accents (ò, é, è, à, ç); if not, subset a fuller copy to Latin plus Latin-Extended.** Budget: the three weights at about 25 KB each fit; the **shop route loads at most two weights**. Use `font-display: swap` with the system stack as fallback and match fallback metrics (`size-adjust`) to limit layout shift. **Check Satoshi's licence terms for our use before shipping** (it is distributed free through Fontshare; confirm that this use and self-hosting are covered).

**Shape and spacing** (read from the draft's HTML):

| Token | Value | Where in the draft |
|---|---|---|
| `--radius-card` | 16px (receipt card 18px) | Recipient row, quote card, hand-over card |
| `--radius-button` | 16px | "Send to Mama", "Send more" |
| `--radius-key` | **`999px` (a full pill: renders as 26px at the 52px key height, Draft C's keypad)**. Draft A itself uses 14px | Keypad keys, including Back and Done |
| `--radius-chip` | `18px 18px 18px 4px` (a speech bubble with a small tail on the lower-left) | Reply from the recipient |
| `--radius-pill` | 999px | Small label pill |
| `--radius-input` | 14px (not drawn in the draft; matches Draft A's key radius) | Text inputs |
| `--radius` | kept as an alias of `--radius-button` so old code still works | n/a |
| `--control-height` | 52px for buttons and keys (never below `--tap`) | Every button and key |
| `--tap` | 48px minimum height of any control | n/a |
| Key grid gap | 8px, three equal columns | Keypad |
| PIN dot | 14px circle; gap 14px; filled `--color-fg`, empty has a 2px `--color-ring` outline | Hand-over screen |
| Screen padding | 20px; vertical gap between blocks 14 to 18px | Phone screens (the draft's 290px frame is only a mock-up) |
| Spacing | unchanged 4 px steps | n/a |
| Focus | 2px outline in `--color-action`, 2px offset, on every control | n/a |

There is a dark theme only in the MVP. The Cream light ground exists for print, the deck and the trifold, not for the app.

## The keypad (PinPad)

`web/components/ui/PinPad.tsx` is the highest-attention component, so it is specified in detail.

- Layout, top to bottom (from the draft's hand-over screen): the shop name; a Canopy card with "Card line 7 · ready", the 12-character code in groups of four, and "Pay out US$X" in Leaf; the instruction row ("Hand the phone to your customer") with a Gold phone icon; four PIN dots; the keypad; the helper line ("Keys move every time. The PIN never leaves this phone."). **The "Pay out" amount is shown so the recipient sees what she is approving.**
- **Keys are fully rounded pills** (`--radius-key`), 52 px tall (`--control-height`), 8 px gaps, three equal columns, fill `--color-surface` (Canopy), digit in `--color-fg`, 22 px / 500, tabular numerals. Pressed state is a clear tone change plus a slight scale; no animation longer than 100 ms. On a 360 px screen the whole pad (four rows of 52 px plus gaps) must fit without scrolling.
- **Last row, as in the draft:** **Back** (transparent on Night, `--color-muted` text, 15 / 500), the last digit, and **Done** (a Leaf pill, Night text, 15 / 700). The current code puts Clear and Back in the grid and a separate Done button below; the UI person may adopt the draft's arrangement as long as there is still a way to clear all digits (keep it, with its lucide icon and label, if it fits).
- Dots: 14 px, filled `--color-fg` when entered, a hollow 2 px `--color-ring` outline when empty. They are `aria-hidden`; the pad announces "n digits entered" to screen readers.
- **Do not change behaviour:** the digit order is scrambled on the client only, re-scrambled after every submit and reset, the PIN lives only in component state, and the pad clears itself after 60 seconds. UI work may restyle and rearrange the markup but must not touch `shuffledDigits`, the auto-clear timer or the props.
- **Frozen component API:** `PinPad({ length?, submitLabel, clearLabel, backLabel, onSubmit, resetKey? })`.

## Components

Built once in `web/components/ui/` and reused everywhere. Props listed here are the **frozen seam**: the UI track may add optional props and restyle freely but may not rename or remove an existing prop without telling the Core track.

| Component | Draft A look |
|---|---|
| `Button` | 52 px tall, `--radius-button`, label 17 / 700. Primary: Leaf fill, Night text. Secondary: transparent with a 1 px Leaf outline and Leaf text (the draft's "Send more"). Ghost: text only. Optional icon. Full width on mobile |
| `Input` | Visible label above; Canopy fill; `--radius-input` |
| `Amount` | Large tabular figure with currency code (the draft's "$200.00", 48 / 700, or 34 / 700 on a receipt). Props: value, currency |
| `Row` | Label left (`--color-muted`), value right (500, tabular); used for quote and receipt details inside a Canopy card, 12 px apart |
| `StatusLine` | Icon + words. May now use Leaf or Clay for the icon, never colour alone. The draft's success mark is a 56 px Leaf outline circle with a check |
| `PinPad` | See above |
| `Screen` | Page shell: optional greeting row with the logo, title, one primary action pinned at the bottom |
| `Card` (new) | Canopy surface, `--radius-card`, 16 px padding; used for the recipient row, the quote, the hand-over code and the receipt |
| `Avatar` (new) | 40 px Gold circle with an initial in `--color-on-highlight`, 700 (the draft's "A" for Akosua) |
| `ReplyChip` (new) | Gold bubble (`--radius-chip`), label 12 / 500 over the message 16 / 700, text `--color-on-highlight` (the draft's "Received, thank you") |
| `Logo` (new) | The paper-cut family mark (three leaf-green figures with a gold halo behind the middle one), plus the wordmark in Satoshi 700, letter-spacing −0.02em. The SVG is in the draft HTML (viewBox `0 0 120 86`; shown at 67×48 beside the wordmark and 34×24 in the app header). Extract it into `web/components/ui/Logo.tsx` |
| `CardFace` | On-screen preview of the printed card. The **printed PDF stays one colour on white** |

**Imagery rules.** The logo, the check mark on "has the money", and outline icons (lucide-react, 20 to 24 px, always beside a text label) are in. Photos, gradients, drop shadows and the cut-paper family illustration (Draft C's hero) are **not** in the MVP; flat only.

**Copy and voice** (unchanged from the draft): warm, first names, the family's own words. "Odette has the money", not "External transfer complete". No crypto words on any screen except `/proof`.

**Real content for every screen.** The draft's sample content is from a Ghana mock-up (cedis, Kumasi, "Auntie Ama's", a 2% fee, all-digit codes, GH₵ 500 payouts) and is wrong for Transend in ways that matter, not just in the names. Use the seeded demo data that already lives in `web/lib/demo/` (recipient Odette Pierre, her mother, in Môle-Saint-Nicolas; card `TS4F2K9Q`; Boutik Marie-Ange), so screens, screenshots and the video all agree:

| Draft A shows | Use instead | Why |
|---|---|---|
| "Hi Kwame" | "Hi Jean" (the sender's first name) | The sender is a Haitian-Canadian in Montréal |
| "Mama Akosua", avatar "A" | "Odette Pierre", avatar "O" | The seeded demo recipient |
| "Kumasi · card ending 3317" | "Môle-Saint-Nicolas · card TS4F2K9Q" | Card IDs are 8 characters and shown in full; there is no "ending" number |
| "You send $200.00" | "You send C$200.00" | The sender pays in Canadian dollars |
| "She receives GH₵ 2,000.00" | "She gets US$137.39" | The real quote: (200 − 1.49) × 0.6921 |
| "Fee $4.00 · 2%" | Two rows: "Fee C$1.49" and "Rate 1 CAD = 0.6921 USD (demo rate)" | The fee is flat; the 2.2% markup is inside the rate. "Demo rate" must always show |
| "Rate held for 30 seconds" | Keep, as a live countdown | Matches the 30-second quote |
| "Send to Mama" | "Send to Odette" | First name |
| "Auntie Ama's Provisions" | "Boutik Marie-Ange" | Seeded demo shop |
| "Card line 7 · ready" | "Card line 4 · ready" | The demo card has 3 lines used |
| "4821 0937 5560" | "QWCA 5KHE 7QET" (line 4 of the demo card) | Real codes are 12 Crockford base32 characters (digits **and letters**, never I, L, O or U) in three groups of four. Check the code style with letters at 360 px |
| "Pay out GH₵ 500.00" | "Pay out US$40.00" | The most one payout can be is US$100 (US$50 when tense) |
| "Mama has her money" | "Odette has the money" | First name in headlines. The current string shows the full name; change it in `web/strings/sender.en.ts` |
| Receipt "GH₵ 500.00" | "US$40.00" | |
| "Where: Auntie Ama's, Kumasi" | "Where: Boutik Marie-Ange, Môle-Saint-Nicolas" | |
| "Left on card GH₵ 1,500.00" | "Left on card US$97.39" | 137.39 − 40.00. Only the sender sees this; the shop never sees a card's balance on its receipt |
| "From Mama · Received, thank you" | "From Odette · Received, thank you" | One of the three preset replies |

**Content rules:**
- **Always write the currency code.** `C$` before anything the sender pays, `US$` before anything the recipient collects; never a bare `$`, which is ambiguous between the two. Never GH₵ or HTG on screen.
- Two decimals and tabular numerals on every amount.
- **Never show an amount a real screen could not show:** no payout above US$100, no balance above US$635, no top-up below C$100.
- Commune names have accents and hyphens and can be long ("Môle-Saint-Nicolas", "Anse-à-Foleur"); let them wrap rather than truncate, and test at 360 px.
- All names are fictional demo people. Never use a real person's name or a real shop.
- English for now; every string goes through `web/strings/` so Kreyòl and French can follow.

## UI work packages

Each package lists what to do, the files, and when it is done. Packages U1 to U3 come first; U4 and U5 can then run in parallel; U6 needs the fixtures described under "The seam".

| ID | Package | Files (UI owns) | Done when |
|---|---|---|---|
| **U1** | Tokens, fonts, base styles | `web/styles/tokens.css`, `web/components/ui/ui.css`, `web/app/layout.tsx` (font loading only), `web/public/fonts/` | Whole app renders on Night with Satoshi, no hard-coded visual value outside `tokens.css`, contrast rules above met |
| **U2** | Primitives and a style guide | `web/components/ui/*`, new `web/app/dev/styleguide/page.tsx` (dev only, returns 404 in production) | Every component shown in every state (default, pressed, focus, disabled, error) on one page |
| **U3** | PinPad restyle | `web/components/ui/PinPad.tsx` (markup and classes only), `ui.css` | Pill keys; 360 px wide shows the whole pad without scrolling; behaviour unchanged |
| **U4** | Sender app screens | `web/app/(sender)/app/**/page.tsx`, `layout.tsx`, `web/components/CardFace.tsx`, `PrintButton.tsx` | Every sender screen restyled to Draft A at 360 and 430 px |
| **U5** | Shop app screens | `web/app/(shop)/shop/**` | Every shop screen restyled; 48 px minimum taps; under the 150 KB JS and the font budget; Slow 3G usable |
| **U6** | New v2 screens | Sender Grow; `/admin/savings`; the Savings and Growing lines on Home and Card; the forecast view on `/admin/cash`. | Built against fixtures (see the seam); all states shown: loading, empty, error, success |
| **U7** | Admin and judges' pages | `web/app/admin/**`, `web/app/proof/page.tsx`, `web/app/page.tsx` | Restyled; `/proof` shows the Savings panel |
| **U8** | Accessibility and performance pass | everything above | See "Definition of done" |

## The seam: what the UI track must not touch, and how the two tracks connect

**UI track owns (may edit freely):** `web/styles/**`, `web/components/**`, `web/public/**`, `web/strings/**` (values and new keys), the visual layer of `web/app/**/page.tsx` and `layout.tsx` (markup, class names, layout, copy keys).

**Core track owns (UI may read, never edit):** `contracts/**`, `scripts/**`, `web/lib/**` (including `web/lib/demo/**`, which is replaced by real API clients), `web/app/api/**`, `web/db/**`, `web/proxy.ts`, `next.config.ts`, `.env*`, `docs/technical.md`.

**Rules for the page files, which mix both:** the UI track changes JSX, class names and layout. It does not change which `lib/` functions a page calls, their arguments, or any control flow that moves money, checks a PIN or reads a risk decision. If a page needs data it does not have, the UI track adds a row to `docs/ui-requests.md` (screen, field, example value) and builds against a fixture in the meantime. The Core track answers by adding a typed view-model and a fixture.

**The three seams between the tracks:**

1. **Tokens and strings.** The UI track defines how things look and what they say. Core never hard-codes a visual value or user-facing string.
2. **Component props.** The props in the Components table are frozen.
3. **View-models.** Core exposes typed data for each screen from `web/lib/`. Until the real API lands, the same functions exist in `web/lib/demo/*` with fake data; **their exported names and signatures are the interface**, and Core keeps them identical when it swaps the implementation. New v2 screens get fixtures for: a sender card with Savings (available, set aside, earned, rate); a shop's forecast band, ceiling and restock windows.

**Git hygiene (recommended).** Add `.github/CODEOWNERS` with the two lists above. Branches: `ui/<topic>` and `core/<topic>`. Each track reviews the other's changes only where they touch a seam file (`strings`, view-model types, component props).

## Brief to paste into Claude for the UI track

> You are working on the **UI track** of the Transend app, in the repo's `web/` folder. Read `docs/prd.md`, the section "UI track: design system and hand-off", and the design files in `docs/design/` (Draft A is page 2 of the PDF; the HTML file holds the exact values, the logo SVG and the Satoshi font files).
>
> **Goal:** restyle the whole product to Draft A (Satoshi, Night market) with **fully rounded pill keypad keys**, and build the new screens (Grow, admin savings, the forecast view on admin cash) against fixtures.
>
> **You may edit:** `web/styles/**`, `web/components/**`, `web/public/**`, `web/strings/**`, and the markup, class names and layout of `web/app/**/page.tsx` and `layout.tsx`.
> **You must not edit:** `contracts/`, `scripts/`, `web/lib/**`, `web/app/api/**`, `web/db/`, `.env*`. Do not change which `lib/` functions a page calls, their arguments, or any logic that moves money, checks a PIN or decides a payout. If you need data that does not exist, add a row to `docs/ui-requests.md` and use a fixture.
> **Rules:** every colour, font, radius and spacing comes from `web/styles/tokens.css` (keep existing token names, change values, add new ones). Every user-facing string comes from `web/strings/`. No crypto words on any screen except `/proof`. Colour is never the only signal. Do not change the PinPad's scramble, auto-clear or props. The shop app must work at 360 px, with 48 px minimum taps, under 150 KB of JavaScript (gzipped), and be usable on Slow 3G.
> **Order:** U1 tokens and fonts, U2 primitives and `/dev/styleguide`, U3 PinPad, then U4 sender and U5 shop, then U6 and U7.
> **Check your work:** `cd web && npm run typecheck && npm run build`, then `npm run dev` and look at every screen at 360 px and 430 px. Commit after each package with a clear message. Never commit secrets.

## Definition of done for the UI track [UI]

- Every screen in "Apps and screens" matches Draft A at 360 px and 430 px, in every state it can reach.
- No hard-coded colour, font, radius or spacing outside `tokens.css`.
- Contrast: body text at least 4.5:1 and all text on Canopy or Night checked; Clay rules respected; success and failure carry an icon and words.
- The shop route is under 150 KB of JavaScript (gzipped), under the font budget, and usable on Slow 3G.
- Keyboard focus is visible on every control; every control is at least 48 px tall; the PinPad is announced sensibly by a screen reader.
- The PinPad's scramble, auto-clear and props are unchanged.
- `npm run typecheck` and `npm run build` pass.

---

## Tech stack, repo layout and environments [CORE]

Use one repository (the team's public GitHub repo), one Next.js deploy on Vercel, one Soroban contract on testnet and one Postgres database.

| Layer | Choice | Notes |
|---|---|---|
| Contract | Rust, soroban-sdk, target `wasm32v1-none`, Stellar CLI | Use the latest stable releases at build time |
| Contract bindings | `stellar contract bindings typescript` | Generated into `web/lib/contract/` |
| Web and API | Next.js (App Router), TypeScript, React | One project serves `/app`, `/shop`, `/proof`, `/admin` and `/api` |
| Stellar client | `@stellar/stellar-sdk` | Soroban RPC + Horizon, fee-bump transactions |
| Database | Postgres (Neon free tier) with Drizzle ORM | Users, recipients, cards (no codes), PIN hashes, quotes, transfers, messages, shops, areas, sample cash data, **forecasts, savings activity** |
| Auth | Cookie sessions (iron-session) | Email + password, bcrypt; separate sender, shop and admin roles |
| PIN hashing | argon2 (argon2id) | Per-card salt + `PIN_PEPPER` |
| PDF | pdf-lib and qrcode | Card generator |
| **ML (offline)** | **Python with scikit-learn, in `scripts/ml/` only** | **Trains the forecast model and exports it as JSON; never runs in production** |
| **ML (runtime)** | **Pure TypeScript forecast scoring in `web/lib/risk/`** | **No Python, no network call, no third-party AI service** |
| Hosting | Vercel | Live URL for Devpost |
| Tests | `cargo test`; Vitest for API and risk logic; one Playwright end-to-end test of the demo flow | |

**Repo layout**

```
contracts/transend_escrow/   Soroban contract, tests
web/                         Next.js app and API
  app/(sender)/app/...       sender screens                     [UI]
  app/(shop)/shop/...        shop screens                       [UI]
  app/proof/, app/admin/     judges' page, admin pages          [UI]
  app/api/...                route handlers                     [CORE]
  components/ui/             design-token components            [UI]
  styles/tokens.css          every visual value                 [UI]
  strings/                   user-facing text, one file per app and language   [UI]
  public/fonts/              self-hosted Satoshi                [UI]
  lib/stellar/, lib/contract/  SDK helpers, generated bindings  [CORE]
  lib/risk/                  area risk, cash ceilings, forecast   [CORE]
  lib/savings/               stake, unstake, yield views        [CORE]
  db/                        Drizzle schema, migrations         [CORE]
scripts/
  deploy-testnet.ts          issuer, demo USDC, SAC, contract, sponsor; writes IDs
  seed-demo.ts               demo sender, recipient, 3 shops in 2 Nord-Ouest communes, 15 cards, 60 days of synthetic withdrawals
  aml-flags.ts               AML event scan
  ml/train_forecast.py       trains the forecast model, exports JSON
docs/
  prd.md                     this document
  ui-requests.md             data the UI track needs from Core
  technical.md               plain-English protocol doc for judges
  architecture.png           on-chain vs off-chain diagram
.env.example, README.md, LICENSE (MIT)
```

**Testnet assets:** `deploy-testnet.ts` creates our own issuer account and issues a demo USDC, then deploys its Stellar Asset Contract. This avoids depending on an outside faucet. If time allows, switch to Circle's testnet USDC with no contract change, since the token address is a constructor argument. The yield reserve is funded from the same demo USDC. A mock HTG asset is needed only for the gourde-payout stretch.

**Environment variables** (all in `.env.example`, none committed): `STELLAR_NETWORK=testnet`, `SOROBAN_RPC_URL=https://soroban-testnet.stellar.org`, `HORIZON_URL=https://horizon-testnet.stellar.org`, `NETWORK_PASSPHRASE` ("Test SDF Network ; September 2015"), `CONTRACT_ID`, `USDC_ASSET`, `ADMIN_SECRET`, `VERIFIER_SECRET`, `SPONSOR_SECRET`, `KEY_ENCRYPTION_KEY`, `PIN_PEPPER`, `SESSION_SECRET`, `DATABASE_URL`, `DEMO_RATE_CAD_USD=0.7077`, `FX_MARKUP_PCT=2.2`, `FLAT_FEE_CAD=1.49`, `MIN_TOPUP_CAD=100`, `ADMIN_PASSWORD`, plus the new `FORECAST_MODEL_MODE=rules`, `DEMO_APY_BPS=400`, `MIN_STAKE_USD=10`, `MIN_LIQUID_USD=100`, `MAX_STAKED_TOTAL_USD=5000`, `DEMO_YIELD_SPEEDUP=1`. **Removed:** `DURESS_DEFAULT_USD`.

## Security and compliance requirements [BOTH]

In Haiti the two risks judges will press on are physical safety and money laundering, so the MVP must show a working answer for each threat below, even where the production partner is mocked.

| Threat | MVP defence |
|---|---|
| Robbed on the way home | Small withdrawals near home (US$100 cap, US$50 when tense); the rest stays digital, and money set aside in Savings cannot be collected at a shop at all |
| Forced to withdraw | Small per-withdrawal and daily caps limit what can be taken; most of the balance can be set aside in Savings, where no shop can pay it out; the sender can freeze the card |
| Shop robbed | Cash ceiling per shop from the forecast; restocking at varying times through the shop's own MonCash or Fonkoze account; no sign on the door |
| Gangs taxing a shop or area | Area status "closed" pauses payouts there and sends people to another shop or a partner branch |
| Lost or stolen card | Codes need the PIN; the sender can freeze it or refund the liquid balance (nice to have) |
| Shoulder-surfed PIN | Scrambled keypad with a new order each time, masked entry, auto-clear after 60 s |
| Guessed PIN | Card freezes after 5 wrong tries; only the sender unfreezes it |
| Guessed code | 60-bit codes, single use, and the verifier must also sign |
| Replayed code or double tap | The contract marks a line used before paying; a resubmit fails with `CodeUsed` |
| Shopkeeper fraud (paying less than approved) | The amount is fixed in the transaction and shown on the hand-over screen; the sender sees the exact US$ amount and the recipient can reply "Please call me" |
| Mule cards | Max 3 cards per sender and 2 senders per card; the AML script flags the rest |
| Card used far apart | The AML script flags redemptions over 50 km apart within 2 hours |
| Sanctioned person | Every sender, recipient and shop is screened at sign-up and activation, and again when the list changes |
| Network outage | Withdrawals retry and settle when the signal returns; SMS mode is the stretch fallback |
| Leaked server keys | Keys live only in Vercel environment variables; the admin key can pause the contract and rotate the verifier |
| Yield source cannot pay | MVP uses a mock vault with a funded reserve; principal always backed 1:1; total cap; staking can be paused; move-back is always allowed |
| Yield misread as a promise | "Demo rate, not guaranteed" on every Grow screen; never advertised |
| A forecast trained on fake data is mistaken for real accuracy | `/admin/cash` says "Sample data" and which forecaster is live; the pitch states it; the rules baseline is the default |

**Required hygiene**

- No secret key, `.env` file or PIN in the repo, logs, analytics or client bundles. Run `git log -p | grep -E "S[A-Z2-7]{55}"` before making anything public.
- Every API route checks the session role (sender, shop or admin) and that the caller owns the card, shop or area it touches.
- Rate-limit `/api/redeem`, `/api/balance` and `/api/auth/*` per IP and per card.
- Store no images, ID documents or call recordings. Keep personal data to name, relationship, commune and email.
- **Forecast records hold numbers only; never a PIN, a code or a name.**
- Show a line in the footer of every screen in the sender and shop apps: "Testnet demo. No real money."

### What the KYC research found (Canadian rules checked Nov 7, 2026; Haiti rules from the Haiti research doc; not legal advice)

Haiti is allowed but higher-risk: it is on the FATF grey list, and Canada sanctions named Haitian gang leaders and politicians. The card limits keep each card low-value, but the real compliance answer is a fully verified sender, screening of every name, small caps, a licensed Haitian payout partner and on-chain monitoring.

| Rule | What it means for Transend | Answer in the pitch |
|---|---|---|
| Canada, FINTRAC (PCMLTFR s. 95): an MSB must verify anyone who asks it to send an EFT or virtual currency transfer of C$1,000 or more, and the beneficiary it pays an international EFT of C$1,000 or more | Staying under C$1,000 does not remove KYC; designing limits only to dodge it would look like structuring. Needs FINTRAC MSB registration | "We verify every sender through a licensed partner; the limits cap risk, they don't replace checks" |
| Canada, FINTRAC 24-hour rule: related transactions are added together for the C$10,000 reports | Per-sender C$900 a day keeps far below it | Covered by the limits |
| Canada, FINTRAC prepaid accounts: an account allowing C$1,000 or more loaded in 24 hours or held as a balance | The US$635 (about C$900) balance and daily-load caps stay under it. **Yield could lift a balance slightly above; confirm with the advisor** | Each limit has a stated reason |
| Canada, Retail Payment Activities Act: registered payment service providers must keep end-user funds segregated, in trust or insured, since Sept 8, 2025 | Escrowed family money counts; production needs Bank of Canada registration and a safeguarding plan. **Money set aside in a yield source needs its own safeguarding answer** | "Funds sit in escrow 1:1 and would be held in trust" |
| Canada, Special Economic Measures (Haiti) Regulations: assets of named people are frozen and dealing with them is banned; three more were added in March 2025. They target people, not the country | Screen every sender, recipient and shop before activation and on every list update | "Haiti is allowed; we screen every name" |
| FATF grey list: Haiti is under increased monitoring (June 2026) | Canadian banks and partners apply enhanced due diligence; "lighter checks for small amounts" is not a safe argument here | Lean on the verified sender and the partner's checks |
| Haiti, payout: pay out through a partner the central bank already authorizes, such as a transfer house or Fonkoze's microfinance arm; shops act as its agents | The partner, not Transend, pays cash in Haiti | "In Haiti we partner with a licensed institution; shops are its cash-out agents" |
| Haiti, US-dollar payouts: the central bank suspended two provisions of Circular 114-3 on dollar transfers in 2022 | Confirm with the partner that paying out in dollars is allowed today; gourde payout is the fallback | Open question below |
| Haiti, crypto: no crypto law and no licence route found for stablecoins | USDC stays on Transend's side; the recipient's balance is a US-dollar claim the partner pays | "She never touches crypto" |
| Haiti, ID: 2.7 to 3.1 million adults, about 1 in 3, lack a valid national ID (World Bank, Oct 2026) | The recipient may have no valid ID; the controls above carry the risk instead | "No bank, no phone, and no ID trip to a far-off office" |
| FATF Recommendation 16 (revised June 2025): cross-border payments over USD/EUR 1,000 must carry name, address and date of birth; in force by the end of 2030 | Transfers stay under that line | n/a |
| **Yield-bearing products (new)**: whether letting a sender earn yield on a stored balance counts as an investment, a deposit, or a regulated product in Canada or Haiti has **not** been researched | MVP is testnet with a demo rate and no promised return; **real launch is blocked until the advisor answers** | "Savings is a demo of where the money can work; it is not live yield" |

**Open questions for the advisor and Fonkoze:** can the partner pay out in US dollars today? Can a scratch-card balance sit in an account the partner already runs, and what does the partner require from a recipient without a valid ID? What does a MonCash agent earn per payout, so we can price the shop commission? Can we get the results of the 2026 Nord-Ouest stablecoin pilot? **New:** is a sender-chosen yield on a stored balance allowed, and under which licence?

## Acceptance criteria and demo script [BOTH]

The MVP is done when a stranger can run the flow below on the live URL with two phones and a printed card, and verify every step on stellar.expert.

**Acceptance criteria**

1. The contract is deployed to testnet; its ID is in the README and on `/proof`, and all unit tests pass (including the Savings tests)
2. `scripts/deploy-testnet.ts` and `scripts/seed-demo.ts` rebuild the whole demo from an empty testnet in one command each
3. A sender can sign up, add a recipient in an open department, generate a card and download its PDF; a name on the mock sanctions list is refused
4. A shop can request activation, the sender approves it, and the recipient sets her PIN
5. The sender sees a quote (C$1.49 fee, demo rate with markup, US$ out) before sending; an expired quote and a top-up under C$100 are refused
6. A deposit moves testnet USDC into the escrow and the card balance updates
7. Redeeming a valid line + correct PIN pays the shop and shows "Pay US$X" within 10 seconds on a normal connection
8. The same line a second time, a wrong PIN, an over-limit amount and a third withdrawal in a day are each declined with a plain reason
9. Setting the area to "tense" drops the limit to US$50 at once; "closed" declines every payout in that area
10. **`/admin/cash` shows a forecast band, a ceiling and restock windows per shop on sample data, labelled "Sample data", and says whether the forecast is "rules" or "model"**
11. **A sender can set part of a card's balance aside and move it back; the balance splits into available + set aside; the shop's balance check and a redeem see only the available part; a redeem above the available part is declined; setting aside below the US$100 liquid floor is refused with a plain reason**
12. **Yield accrues at the demo rate (visible with the demo clock raised), is capped by the reserve, and every stake, unstake and yield event links to stellar.expert**
13. The sender's inbox shows the pickup and the recipient's preset reply
14. No account but the sponsor ever holds or spends XLM for fees
15. Every transaction on screen links to stellar.expert (testnet)
16. Both apps work at 360 px wide and on Slow 3G throttling
17. **All UI follows Draft A with pill keypad keys, and every visual value comes from `styles/tokens.css` (the UI track's Definition of done)**
18. One Playwright test runs the full flow end to end against testnet, **including one set-aside and move-back**

**Demo script (matches the 60-second video shot list)**

| Time | What happens on screen |
|---|---|
| 0 to 10 s | The sender in Montréal sends C$200 to the recipient after seeing the quote (2.945% all-in) |
| 10 to 25 s | The money lands in escrow; the card balance updates in US$; the deposit is shown on stellar.expert |
| 25 to 45 s | On camera, a real printed card is scratched; the shopkeeper enters the line, then hands the phone over and the PIN is entered |
| 45 to 55 s | "Pay US$X" on the shop phone; "[Recipient's name] has the money" in the sender's inbox; the redeem transaction on stellar.expert |
| 55 to 60 s | The sender sets US$ aside to grow, and the demo clock shows it earning; or the shop taps "tense" and the limit drops to US$50 (pick one for the video) |

## Milestones [BOTH]

The v1 dates (contract Nov 9, full flow Nov 12, freeze Nov 14) are **no longer realistic**: milestone 3 had not started by Nov 13 and v2 adds scope. **The team must reset the dates.** The order below is what matters; the two tracks run in parallel from step 2.

1. **Contract, tests, deploy** [CORE]: done in v1 (27 tests, deployed to testnet).
1b. **Contract v2** [CORE]: remove duress wording; add Savings (`stake`, `unstake`, `accrue`, admin controls, events, errors, tests 9 to 12); redeploy; update the README with the new contract ID.
2. **App shell and screens** [UI + CORE]: built on fake data in v1 in black and white. **UI track runs U1 to U7 now**, against `lib/demo/*` and fixtures. **Core track** adds auth, database and the `lib/` seams in parallel.
3. **Wire API to contract** [CORE]: card generation, activation (one PIN), quote, send, redeem with area and cash-ceiling checks, area risk levels, sanctions mock, fee sponsorship, inbox and `/proof`. Then Savings endpoints. Bring open questions to the technical workshop.
3b. **Trained forecast** [CORE, nice to have]: `seed-demo.ts` synthetic data, `train_forecast.py`, and the `/admin/cash` view on real forecasts.
4. **End-to-end demo works** [BOTH]: every acceptance criterion passes on the live URL.
5. **Polish, README, cards** [BOTH]: the Playwright test, the README and `docs/technical.md`, 15 printed demo cards, the Slow 3G check, `/admin/cash` on sample data, the UI accessibility pass (U8).
6. **Stretch** [CORE]: card renewal, the AML script, auto-move-back from Savings, SMS mode. Freeze code for the video and Devpost.

## Knock-on changes to existing code (from removing duress) [BOTH]

The v1 code on `main` still contains the duress feature. These are the places to change; none is done by this document.

| File | Change | Track |
|---|---|---|
| `contracts/transend_escrow/src/lib.rs` (comments at lines 5, 48, 291) | Remove the duress wording; `freeze` is for a lost card, five wrong PINs, or the sender's choice | CORE |
| `web/lib/config.ts` (`duressDefaultUsd`), `.env.example` (`DURESS_DEFAULT_USD`) | Delete | CORE |
| `web/lib/demo/shop-engine.ts` | Remove `duress` fields, the `activate(cardId, pin, duress)` second PIN, the duress payout and freeze branch | CORE |
| `web/lib/demo/sender-store.ts` | Remove `duressUsd` and `simulateDuress`; add demo Savings so the UI has fixtures | CORE |
| `web/app/(shop)/shop/activate/page.tsx` | Remove the `duress` and `duressb` steps; one PIN, entered twice | UI (flow is unchanged otherwise; Core removes the argument it passes) |
| `web/app/(shop)/shop/approved/page.tsx` | Remove the duress comment | UI |
| `web/app/(sender)/app/cards/[id]/page.tsx` | Remove the duress row and the "demo duress" button; add Available now, Growing, Earned | UI |
| `web/strings/shop.en.ts`, `web/strings/sender.en.ts` | Remove the duress strings; add Grow strings | UI |
| `README.md` ("duress PIN `4321`"), `docs/plan.md` ("duress path", "one duress redeem") | Update to match this PRD | CORE |
| Playwright plan | Replace "one duress redeem" with "one set-aside and move-back" | CORE |

## Instructions for Claude Code and open questions [BOTH]

Build in the milestone order above, getting each one working on testnet before starting the next, and stop to ask rather than guess when this document is silent on something that touches money, keys or PINs.

**How to work**

1. Read this whole document first, then update `docs/plan.md` mapping each section to files and tasks. Ask your questions before writing code.
2. Core track: start with the contract and its tests. Do not wire the web app to the contract until `cargo test` passes and the contract is redeployed to testnet.
3. Keep every Stellar call behind a small module in `web/lib/stellar/` so the apps never build transactions directly.
4. Commit after each working step with a clear message. Never commit secrets; keep `.env.example` current.
5. After each milestone, update the README (setup, run, test, deploy, contract ID, live URL, how to redeem a demo card) and say what is mocked.
6. UI track: follow the "UI track" section exactly (Draft A, pill keypad). Do not invent new colours, fonts or a different brand look; the tokens are the single source.
7. Write all user-facing text in plain, warm English with no crypto words, except on `/proof`. Keep every user-facing string in the strings files so Kreyòl and French can be added later, and never put the words "cash" or "money pickup" on the card itself.
8. Where this document says "nice to have" or "stretch", build it only after every acceptance criterion passes.
9. The forecast may only set a shop's cash ceiling between its floor and the admin cap. Never write code that lets a model output approve a payout or loosen a limit.

**Open questions for the team (defaults are in use until answered)**

- Confirm the Haiti scope defaults in the Scope section (tracker T004)
- Confirm with a licensed Haitian partner (Fonkoze or a transfer house) that US-dollar payout is allowed today
- Confirm the limit values, including the C$500 shop cash ceiling and the Savings floors (US$10 and US$100)
- **Does Transend keep any share of the yield, or does all of it go to the family? (Default: all to the family; confirm against the unit economics model.)**
- **Is a sender-chosen yield on a stored balance allowed, and under which licence, in Canada and in Haiti? Which real yield source, if any, is acceptable?**
- **Satoshi's licence: confirm it covers this use and self-hosting**
- **Keypad: this PRD reads "more rounded like the first one" as pill keys (26 px radius at 52 px height, the same as Draft C's keys) on Draft A's colours, because Draft A's own keys are only 14 px. Confirm that is the shape you meant.**
- Get Kreyòl and French card labels from a native speaker
- Use a real SEP-24 deposit against the Stellar test anchor, or keep it mocked?
- Check the wallet name "Varial Stellar Wallet" in our notes; this PRD uses custodial demo keys instead

## Sources

Unchanged from v1. Canadian rules (opened Nov 7, 2026): Proceeds of Crime (Money Laundering) and Terrorist Financing Regulations, Part 2 (s. 95), Justice Laws Website; When to verify the identity of persons and entities, FINTRAC (prepaid product account definition); The 24-hour rule, FINTRAC; Safeguarding end-user funds under the Retail Payment Activities Act, Mondaq; Update to Recommendation 16 on payment transparency, FATF, June 2025. Haiti facts, carried over from Transend: Haiti Corridor Research, which has the full citation log: Remittance Prices Worldwide, Canada to Haiti, Q3 2025, World Bank; Digital cash in fragile contexts, Mercy Corps Ventures; Fonkoze participating in a new pilot, Fonkoze; Canada imposes additional sanctions against individuals linked to the crisis in Haiti, Global Affairs Canada, March 2025; FATF public statement on jurisdictions under increased monitoring, June 2026; BRH temporarily suspends two provisions of Circular 114-3, IciHaiti; One in three Haitian adults lacks a valid ID, World Bank via Devdiscourse, Oct 2026; Haiti: insecurity in the Artibonite, Centre and Ouest departments, ACAPS, May 2026; Twilio SMS pricing, Haiti; Transend Unit Economics model (price, profit and break-even). **New in v2:** Transend design language drafts (Draft A, Satoshi, Night market). The yield, regulatory and model-accuracy claims in v2 are design decisions or open questions, not researched facts.
