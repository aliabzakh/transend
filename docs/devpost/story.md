![Transend: cash home, hand to hand](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/01-hero.png)

**Try it:** [transend.vercel.app](https://transend.vercel.app) · judges' page with live contract events: [/proof](https://transend.vercel.app/proof) · contract [`CA5VT3QZ…CODBMIT`](https://stellar.expert/explorer/testnet/contract/CA5VT3QZNJXHWKRWTODIQUANZG2LERIPZNPYXNQWKKL3NTTMHCODBMIT) on Stellar testnet. Sender log-in `jean@transend.demo` / `transend-demo`; shop `S-101` / `transend-shop`; demo card PIN `1234`.

## Inspiration

The cheapest ways to send money home assume the person at the other end has a bank account or a smartphone. In rural Haiti, many people have neither. One adult in three has no valid national ID, and two in three had no account of any kind at the last Global Findex survey. These families still depend on money from abroad (remittances were 16% of Haiti's GDP in 2024), so they collect it the only way left to them: in cash, at an agent, often after a long trip. Sending from Canada that way costs up to 9.06% of the amount.

We priced five corridors before choosing one: Ghana, Nigeria, the Philippines, Guatemala and Haiti. Haiti had the widest gap between what cash families pay today and what we could charge. It also has a large community in Montréal to start with.

The idea came from looking at what a rural Haitian family already has. There is no bank nearby, but there is usually a boutik down the road that sells phone credit on scratch cards, and it is often already a MonCash agent. We wanted the money to wait on Stellar until she walks into that shop, with a card like the ones the shop already sells as her whole account.

![Haiti in numbers](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/02-haiti.png)

## What it does

Transend sends money from Canada to families in rural Haiti who have no bank account and no smartphone. Three people take part, and only two of them need a screen.

**The sender.** Jean, in Montréal, adds his mother and the app makes her a printed card. Before he sends, he sees a firm 30-second quote: C$200 in, a C$1.49 fee, and US$137.39 for her, 2.95% all in. When he confirms, USDC moves into a Soroban escrow under her card.

**The recipient.** Odette, in Môle-Saint-Nicolas, carries the card. It has 20 scratch-off codes that each work once, plus a renewal line. It shows no balance, and she needs no phone, app or ID number to use it.

**The shopkeeper.** She types the code and the amount, then hands the phone over. Odette sees "Pay out US$40" and enters a PIN she chose herself on a scrambled keypad. The contract pays the shop in USDC in about five seconds, Odette gets her cash, and the shop is paid back the same day into its MonCash account. Jean gets "Odette has the money", and Odette can send back a preset reply.

![The printed card](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/15-card.png)

![Sender app](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/13-sender.png)

![Shop app](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/14-shop.png)

![How the money moves](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/11-money.png)

### The AI cash forecast

A small shop can't hold much cash, and in Haiti a full till is a target. A gradient-boosted quantile model predicts each shop's payouts for the coming week from the calendar, the top-up habits of senders nearby and the balances waiting on cards. The 90th percentile plus 10% becomes the shop's cash ceiling, and the verification service refuses any payout that would push the shop past it. On days it had never seen, the model missed by US$21 a day, against US$58 for a rules baseline. These numbers come from synthetic data, because no real withdrawals exist yet, and the app labels them that way.

![AI cash forecast](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/16-forecast.png)

### Savings

A sender can set part of a card's balance aside. It earns yield, all of which goes to the family, and no shop can pay it out until the sender moves it back, so a lost card never reaches it. On testnet the yield comes from a funded reserve at a 4% rate labelled as a demo rate.

![Activation and Savings](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/17-grow.png)

## The money

**Why it's cheaper.** Cash pickup is expensive because of everything behind the counter: agent networks, armoured cash delivery and float. Transend pays for none of that. Shops pay out from cash they already take in from sales and are paid back digitally, so no cash is trucked anywhere. Moving the money on Stellar costs about six cents per top-up, and our sponsor account pays it, so nobody in the flow holds XLM.

![Cost comparison](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/03-cost.png)

![Price by top-up size](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/04-size.png)

**Each transfer pays for itself.** A C$200 top-up brings in C$5.89. The shopkeeper earns C$2.00 of it (1%, in line with what mobile-money agents earn on a cash-out), every other cost takes C$2.62, and Transend keeps C$1.27.

![Where the money goes](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/05-waterfall.png)

**The company pays for itself at 2.3% of the corridor.** With a licensed payout partner holding the licences, fixed costs are about C$4,000 a month, so 3,145 top-ups a month breaks even. Starting at 300 top-ups and growing 12% a month, each month covers its own costs from month 22, and the C$53k spent getting there is paid back by month 34.

![Break-even](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/06-breakeven.png)

![36-month path](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/07-growth.png)

**Who we serve first.** Haitian Montrealers sending to the Nord-Ouest, Nord and Sud departments. These areas are safer than Port-au-Prince, and a Stellar stablecoin pilot has already paid women through local vendors there this year. A family that sends C$200 a month and switches from agent cash saves about C$135 a year.

![Market size](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/09-market.png)

![Five corridors compared](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/08-corridors.png)

## How we built it

![Architecture](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/10-architecture.png)

- **Soroban escrow, in Rust.** One contract holds every card's USDC. Each card stores 20 code hashes, `sha256(card ID ‖ line ‖ code)`, and a bitmask of used lines, so a line works exactly once and a dropped connection can retry without paying twice. A redeem needs the verifier's signature and stays inside hard caps: US$100 per withdrawal, two a day, US$635 per card. Savings adds stake, unstake and yield accrual against a funded reserve. The contract has 37 unit tests and is deployed to testnet.
- **Verification service.** Next.js route handlers on Vercel check the PIN (argon2id with a per-card salt and a server pepper; it never goes on-chain), the area's status (calm, tense or closed, set by the shopkeeper with one tap) and the shop's cash ceiling. The service then simulates the redeem, signs as verifier, fee-bumps it with the sponsor key and submits it.
- **Fee sponsorship.** Every transaction is fee-bumped, so sender and shop accounts hold 0 XLM.
- **Quotes and cards.** Quotes are firm for 30 seconds and follow SEP-38's shape. The card PDF (pdf-lib and qrcode) is made once, and the server keeps only hashes of the codes.
- **Forecast.** Trained offline with scikit-learn, exported as plain JSON trees and scored by a short TypeScript function inside the API. There is no Python and no outside AI service at runtime, and no language model anywhere in the money path. A nightly Vercel cron recomputes every shop's ceiling.
- **Data.** Postgres on Neon with Drizzle. The demo's custodial keys are encrypted at rest with AES-GCM.
- **Proof.** The /proof page reads contract events through Soroban RPC and links each one to stellar.expert, with no log-in.

![One withdrawal, step by step](https://raw.githubusercontent.com/aliabzakh/transend/e7ab19223f32afbbc2b3ccdf89f1c91af712a4a0/docs/devpost/12-redeem.png)

Ali and Sammara built the contract and the backend. Ali and Shivan designed the screens for low-end Android phones on 2G. Nelli led the corridor research and the unit economics. Sammara and Shivan run the pitch.

## Challenges we ran into

- **Taking a PIN on someone else's phone.** Odette enters her PIN on the shopkeeper's phone. We show the payout amount on that screen before the keypad so she sees what she is approving, scramble the keys every time, and send the PIN only to our verification service, which checks it against a salted hash.
- **Codes on a public ledger.** The code hashes are public, so short codes could be guessed offline. Each code is 12 characters of Crockford base32 (60 bits), and a redeem still needs the PIN check and the verifier's signature.
- **Getting under 3% while paying the shop.** A flat fee eats small transfers, so we set a C$100 minimum and kept the fee at C$1.49. We also kept text messages on the sender's side: Twilio lists SMS to Haiti at about US$0.29 each, so three texts would cost almost our whole margin on a transfer.
- **Honest model numbers.** There is no real withdrawal history yet, so we trained on synthetic data and set a rule: the trained model replaces the rules baseline only if it beats it by at least 10% on held-out days. Getting the TypeScript scorer to match scikit-learn exactly meant exporting split thresholds at full precision.

## Accomplishments that we're proud of

- The whole flow runs on Stellar testnet at a public URL: send, scratch, PIN, settle, confirm. A payout settles in 2 to 6 seconds, and every transaction links to stellar.expert.
- The family pays 2.95% all in while the shopkeeper earns 1% and Transend keeps C$1.27 per top-up.
- The recipient needs a card and a PIN. She needs no phone, app, wallet or XLM.
- 37 contract tests, and a forecast that cut error by 63% against the baseline on held-out days.

## What we learned

- Cash corridors are expensive because of the cash network, not the transfer. Once settlement costs six cents, the money can go to the person doing the work, which here is the shopkeeper.
- Advisors at the Stellar workshops pushed hardest on KYC and money laundering, and suggested prepaid cards instead of scratch cards. We changed the design in response: every sender is verified, a card holds at most US$635 (under FINTRAC's C$1,000 prepaid line), and a sender can fund at most three cards. We kept scratch cards for Haiti because corner shops there have no card terminals, and moved prepaid cards to the expansion plan.
- An early design restocked shops with cash through MoneyGram. We dropped it once we saw that delivered cash is what gets robbed. Shops now pay out from their own sales cash and are paid back digitally.

## What's next for Transend

- Sign a licensed Haitian payout partner and bring on the first ten MonCash agent shops in the Nord-Ouest.
- Run a pilot with Haitian Montrealers, then retrain the forecast on real payouts.
- Replace the mocks: a real SEP-24 anchor for CAD to USDC, Circle's USDC, and mainnet.
- A shop app in Kreyòl and French, and an SMS mode for days when mobile data is down.
- Ghana next, at the same price, where families would save about C$98 a year. Where shops have card terminals, the same escrow can sit behind a prepaid card instead of a scratch card.
