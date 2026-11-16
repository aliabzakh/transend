![Transend: cash home, hand to hand](https://raw.githubusercontent.com/aliabzakh/transend/a3e4678bb8c3f5b53dafb5ea08dc14738275c083/docs/devpost/images/01-hero.png)

**Try it:** [transend.vercel.app](https://transend.vercel.app)
- Sender log-in `jean@transend.demo` / `transend-demo`
- Shop `S-101` / `transend-shop`; demo card PIN `1234`
- Operations map with the AI forecast for every shop, no log-in: [/ops](https://transend.vercel.app/ops)
- Judges' page with live contract events: [/proof](https://transend.vercel.app/proof)
- Contract [`CCNJKUOE…ZFJS5DO`](https://stellar.expert/explorer/testnet/contract/CCNJKUOENNFTJO7MUJS6FXDD74KHURJMO5S3JMVPVX3GOWDZ4ZFJS5DO) on Stellar testnet

## Inspiration

The cheapest ways to send money home assume the person at the other end has a bank account or a smartphone. In rural Haiti, many people have neither. One adult in three has no valid national ID, and two in three had no account of any kind at the last Global Findex survey. These families still depend on money from abroad (remittances were 16% of Haiti's GDP in 2024), so they collect it the only way left to them: in cash, at an agent, often after a long trip. Sending from Canada that way costs up to 9.06% of the amount.

We priced five corridors before choosing one: Ghana, Nigeria, the Philippines, Guatemala and Haiti. Haiti had the widest gap between what cash families pay today and what we could charge. It also has a large community in Montréal to start with.

The idea came from looking at what a rural Haitian family already has. There is no bank nearby, but there is usually a boutik down the road that sells phone credit on scratch cards, and it is often already a MonCash agent. We wanted the money to wait on Stellar until she walks into that shop, with a card like the ones the shop already sells as her whole account.

![Haiti in numbers](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/02-haiti.png)

## What it does

Transend sends money from Canada to families in rural Haiti who have no bank account and no smartphone. Three people take part, and only two of them need a screen.

**The sender.** Jean, in Montréal, adds his mother and the app makes her a printed card. Before he sends, he sees a firm 30-second quote: C$200 in, a C$1.49 fee, and US$137.39 for her, 2.95% all in. When he confirms, USDC moves into a Soroban escrow under her card.

**The recipient.** Odette, in Môle-Saint-Nicolas, carries the card. It is an A6 card in Kreyòl, French and English: picture steps on the front, and on the back her card ID and QR, 20 scratch-off codes that each work once, a renewal code and the limits. It shows no balance, and she needs no phone, app or ID number to use it.

**The shopkeeper.** She types the code and the amount, then hands the phone over. Odette sees "Pay out US$40" and enters a PIN she chose herself on a scrambled keypad. The contract pays the shop in USDC in about five seconds, Odette gets her cash, and the shop is paid back the same day into its MonCash account. Jean gets "Odette has the money", and Odette can send back a preset reply.

![The printed card](https://raw.githubusercontent.com/aliabzakh/transend/a3e4678bb8c3f5b53dafb5ea08dc14738275c083/docs/devpost/images/15-card.png)

![Sender app](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/13-sender.png)

![Shop app](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/14-shop.png)

![How the money moves](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/11-money.png)

### The AI cash forecast

A small shop can't hold much cash, and in Haiti a full till is a target. A gradient-boosted quantile model predicts each shop's payouts for the coming week from the calendar (day of week, month start, school fees, year-end), the area's status, last week's payouts and the money waiting on cards nearby. It uses no names or personal data. The 90th percentile plus 10% becomes the shop's cash ceiling, kept between C$150 and the admin's hard cap, and the verification service refuses any payout that would push the shop past it. The forecast never approves or refuses a payout on its own.

We trained it on 26 shops: the 3 real demo shops and 23 simulated shops in real Haitian towns. On the last 14 days of each shop, which it never saw in training, it missed by US$23 a day against US$54 for a rules baseline, 57% better. Its p10 to p90 band is calibrated to hold 80% of those days, and it did. These numbers come from synthetic data, because no real withdrawals exist yet, and every screen labels them that way.

![AI cash forecast](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/16-forecast.png)

### The admin forecast view

`/admin/cash` is where an operator checks the forecast before trusting it. The top of the page says the data is synthetic and gives the held-out result: US$23.27 a day against US$54.33 for the rules. The model only goes live when it beats the rules by at least 10% and the operator switches it on.

Each shop then gets a card:

- **Who is forecasting.** The trained model or the rules baseline, and the area's status (calm, tense or closed).
- **Three numbers.** What the shop paid out in the last 7 days, its cash ceiling now, and the ceiling the forecast suggests, capped at C$1,000.
- **One chart.** Two weeks of actual payouts as bars, then the coming week as the p10 to p90 band with the likely (p50) line, the cash ceiling as a dashed line and a dot on each restock day. It can be read by hover or keyboard.
- **The reason.** One line on why a day runs high, such as "Higher on Saturday: Saturday market" or "month start".
- **The day table.** Low, likely and high for each of the next 7 days, plus the shopkeeper's two restock windows, which change every day.

A Recompute button runs the same job as the nightly cron. Two more admin pages set each area's risk level and each shop's ceiling, and make batches of real demo cards on testnet as print-ready sheets to cut and fold.

![Admin forecast view](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/20-admin-cash.png)

### The operations map

`/ops` shows the whole cash network on a satellite map of Haiti, with no log-in. Each shop is a ring that fills with its cash against its ceiling. Simulated shops are labelled, and the 3 real shops read the database and the testnet contract.

- **Network now.** Cash in shops against the total of their ceilings, paid out this week, shopkeepers' own top-ups and shops low on cash.
- **Next 7 days.** Expected payouts with their p10 to p90 range, and the share of payouts served. The network is compared with a flat C$500 ceiling per shop: in this week's sample run, the forecast ceilings hold 43% less cash on average and still serve 99.9% of payouts. A payout a shop can't cover is sent to the next shop.
- **Model card.** The model version, held-out error, band coverage and training size (4,966 shop-days, all synthetic).
- **Departments.** Shops, top-ups and cash topped up per department.
- **Week playback.** A timeline plays the week in 15-minute steps. Demand is drawn from each shop's band, payouts stop at the ceiling, and shopkeepers top up their own cash in their restock windows. No cash is ever delivered.

![Operations map](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/18-ops.jpg)

Clicking a shop zooms the map to it and opens its panel: cash now, today's ceiling, the last 7 days, its forecast against a backtest band, and its cash through the simulated week with each top-up marked. The backtest forecasts each of the last 14 days only from the days before it. For Boutik Marie-Ange, 12 of the 14 days fell inside the band, with an average error of US$15 a day.

![One shop on the operations map](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/19-ops-shop.jpg)

## The money

**Why it's cheaper.** Cash pickup is expensive because of everything behind the counter: agent networks, armoured cash delivery and float. Transend pays for none of that. Shops pay out from cash they already take in from sales and are paid back digitally, so no cash is trucked anywhere. Moving the money on Stellar costs about six cents per top-up, and our sponsor account pays it, so nobody in the flow holds XLM.

![Cost comparison](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/03-cost.png)

![Price by top-up size](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/04-size.png)

**Each transfer pays for itself.** A C$200 top-up brings in C$5.89. The shopkeeper earns C$2.00 of it (1%, in line with what mobile-money agents earn on a cash-out), every other cost takes C$2.62, and Transend keeps C$1.27.

![Where the money goes](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/05-waterfall.png)

**The company pays for itself at 2.3% of the corridor.** With a licensed payout partner holding the licences, fixed costs are about C$4,000 a month, so 3,145 top-ups a month breaks even. Starting at 300 top-ups and growing 12% a month, each month covers its own costs from month 22, and the C$53k spent getting there is paid back by month 34.

![Break-even](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/06-breakeven.png)

![36-month path](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/07-growth.png)

**Who we serve first.** Haitian Montrealers sending to the Nord-Ouest, Nord and Sud departments. These areas are safer than Port-au-Prince, and a Stellar stablecoin pilot has already paid women through local vendors there this year. A family that sends C$200 a month and switches from agent cash saves about C$135 a year.

![Market size](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/09-market.png)

![Five corridors compared](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/08-corridors.png)

## How we built it

![Architecture](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/10-architecture.png)

- **Soroban escrow, in Rust.** One contract holds every card's USDC. Each card stores 20 code hashes, `sha256(card ID ‖ line ‖ code)`, and a bitmask of used lines, so a line works exactly once and a dropped connection can retry without paying twice. A redeem needs the verifier's signature and stays inside hard caps: US$100 per withdrawal, two a day, US$635 per card. The contract has 27 unit tests and is deployed to testnet.
- **Private card IDs on a public ledger.** The contract never sees the ID printed on a card. It stores each card under an HMAC-SHA256 of that ID with a server secret, so nobody reading the ledger can tell which on-chain card belongs to which person.
- **Verification service.** Next.js route handlers on Vercel check the PIN (argon2id with a per-card salt and a server pepper; it never goes on-chain), the area's status (calm, tense or closed, set by the shopkeeper with one tap) and the shop's cash ceiling. The service then simulates the redeem, signs as verifier, fee-bumps it with the sponsor key and submits it.
- **Fee sponsorship.** Every transaction is fee-bumped, so sender and shop accounts hold 0 XLM.
- **Quotes and cards.** Quotes are firm for 30 seconds and follow SEP-38's shape. The card PDF (pdf-lib and qrcode) draws the card's ID, QR, codes and renewal line onto our designers' template, as two A6 pages for a print shop or one Letter sheet with cut and fold marks for an office printer. It is made once, and the server keeps only hashes of the codes.
- **Forecast.** Trained offline with scikit-learn, exported as plain JSON trees and scored by a short TypeScript function inside the API. There is no Python and no outside AI service at runtime, and no language model anywhere in the money path. A nightly Vercel cron recomputes every shop's ceiling, and a seven-day simulation in TypeScript plays the forecast against a flat ceiling for the operations map.
- **Operations map.** MapLibre on Esri satellite imagery and terrain, with the charts drawn in SVG.
- **Screens.** One design system across the sender, shop and admin apps: the Held logo, Satoshi self-hosted (it covers Kreyòl and French accents), a scrambled pill keypad, and motion that turns off under reduced-motion settings. Every screen fits a 360 px phone on 2G or 3G.
- **Data.** Postgres on Neon with Drizzle. The demo's custodial keys are encrypted at rest with AES-GCM.
- **Proof.** The /proof page reads contract events through Soroban RPC and links each one to stellar.expert, with no log-in.

![One withdrawal, step by step](https://raw.githubusercontent.com/aliabzakh/transend/f971f63684649c49df72fe0684fb0077d94eb36e/docs/devpost/images/12-redeem.png)

Ali and Sammara built the contract and the backend. Ali and Shivan designed the screens for low-end Android phones on 2G. Nelli led the corridor research and the unit economics. Sammara and Shivan run the pitch.

## Challenges we ran into

- **Taking a PIN on someone else's phone.** Odette enters her PIN on the shopkeeper's phone. We show the payout amount on that screen before the keypad so she sees what she is approving, scramble the keys every time, and send the PIN only to our verification service, which checks it against a salted hash.
- **Codes and cards on a public ledger.** The code hashes are public, so short codes could be guessed offline. Each code is 12 characters of Crockford base32 (60 bits), and a redeem still needs the PIN check and the verifier's signature. The card IDs were public too, until we stored each card under a keyed hash of its printed ID.
- **Getting under 3% while paying the shop.** A flat fee eats small transfers, so we set a C$100 minimum and kept the fee at C$1.49. We also kept text messages on the sender's side: Twilio lists SMS to Haiti at about US$0.29 each, so three texts would cost almost our whole margin on a transfer.
- **Honest model numbers.** There is no real withdrawal history yet, so we trained on synthetic data and set a rule: the trained model replaces the rules baseline only if it beats it by at least 10% on held-out days. We added 23 simulated shops in real towns to the 3 real ones for training, and calibrated the band on the 28 days before the hold-out. Getting the TypeScript scorer to match scikit-learn exactly meant exporting split thresholds at full precision.

## Accomplishments that we're proud of

- The whole flow runs on Stellar testnet at a public URL: send, scratch, PIN, settle, confirm. A payout settles in 2 to 6 seconds, and every transaction links to stellar.expert.
- The family pays 2.95% all in while the shopkeeper earns 1% and Transend keeps C$1.27 per top-up.
- The recipient needs a card and a PIN. She needs no phone, app, wallet or XLM.
- 27 contract tests, and a forecast that cut error by 57% against the baseline on held-out days, with a band that held 80% of them.
- An operations map that shows the cash plan for every shop and replays the week, open to anyone.

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
