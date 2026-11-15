# UI requests to the Core track

Data a screen needs but does not get today. Per the PRD's seam, the UI track does not change which `lib/` functions a page calls; it lists the need here and builds without it until Core adds a typed view-model.

| Screen | Field | Example value | Why | Now |
|---|---|---|---|---|
| Shop hand-over (`/shop/pay/pin`) | Shop name | "Boutik Marie-Ange" | Draft A shows the shop name above the hand-over card, so the recipient knows where she is approving | Left out; the page only reads the pending redeem. A `name` on `getPending()` or calling `useShop()` here would do it |
| Sender Done, pickup (`/app/done?kind=pickup`) | Where and when it was collected | "Boutik Marie-Ange, Môle-Saint-Nicolas", "Today, 2:14 pm" | Draft A's receipt has Where and When rows | Shows To, Left on card and the receipt link only |
| Sender Done, pickup | The recipient's latest reply | "From Odette · Received, thank you" | Draft A shows the Gold reply chip under the receipt | Replies show in the Inbox as Gold chips |
| Sender Done, pickup | A link that opens it | `/app/done?kind=pickup&card=...&usd=...&tx=...` | Nothing links to `kind=pickup` yet; the pickup lives only in the Inbox and Home "Latest" | Built and checked by opening the URL |
