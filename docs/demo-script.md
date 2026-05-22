# Hotbox demo script

A 5-minute walkthrough for a sales conversation with a restaurant owner or aggregator. Use three devices — your laptop is the admin tablet, your phone is the customer, a second phone (or a friend's) is the rider.

## Setup (do before the prospect arrives)

```
   Laptop browser  →  https://hotbox.networkbase75.site/admin
   Phone A         →  https://hotbox.networkbase75.site/ (open + login as customer)
   Phone B         →  Install the Hotbox Rider APK (see /admin/rider-app)
                      OR open /rider in a browser tab as fallback
```

Make sure you've already added yourself as both `admin` (via `ADMIN_PHONE` env) and `rider` (via `/admin/riders`).

## Act 1 — "This is what your customer sees" (60 sec)

```
   1. Hand Phone A to prospect. Show /             "Mobile-first, brand-warm."
   2. Tap Burger category, tap Aloo Tikki         "Categories with veg badges,
                                                    full customization."
   3. Pick Cheese variant, add Extra Cheese add-on "Live price recompute."
   4. Add to cart                                  "Cart persists across pages."
   5. Tap "View cart" sticky bar                   "Sticky bar shows count + total."
   6. Tap "Continue to checkout"                   "Phone-OTP only. No password.
                                                    Single number sees order history."
```

## Act 2 — "Pay" (45 sec)

```
   7. Enter phone (if not logged in) → OTP arrives. Tap.
   8. Tap "Add address". Drop the pin on the map. Save.
   9. Tap "Pay ₹X". Cashfree widget opens.
   10. Pay via UPI sandbox or test card                "Real payment provider.
                                                       UPI, cards, wallets."
   11. Show confirmation page                         "Orange = confirmed. Track CTA."
```

## Act 3 — "Now your kitchen" (60 sec)

```
   12. Turn to laptop /admin                          "🔔 Order chime."
   13. Tap Accept                                     "PLACED → ACCEPTED."
   14. Tap Start cooking                              "ACCEPTED → PREPARING. Customer
                                                       phone shows 'Cooking your food'."
   15. Tap Mark ready                                 "PREPARING → READY."
   16. Assign rider dropdown → tap Assign              "Restaurant controls who gets
                                                       the order."
```

## Act 4 — "Now your rider" (90 sec)

```
   17. Pick up Phone B. Open the Rider APK            "Native app. Foreground GPS
                                                       survives screen lock."
   18. Tap "I've picked up the order"                 "Notification appears."
   19. Walk a few steps                                "Phone A's track page shows
                                                       the dot move."
   20. Show the timeline updating on Phone A          "Customer never wonders what's
                                                       happening."
   21. Tap "I've delivered the order"                 "DELIVERED. Customer sees
                                                       'thanks' state."
```

## Closing (30 sec)

```
   22. Show /admin home — today's revenue tile        "Owner sees orders + money in
                                                       real time."
   23. Show /admin/menu — toggle an item off          "Sold out? Off. Customer sees
                                                       it within seconds."
   24. Show /admin/settings — pause toggle             "Closing early? Pause. No new
                                                       orders, menu stays browseable."
```

## Pitch close

"Three things you don't get from Swiggy:

1. **No commission per order.** Flat platform fee, your money.
2. **Your brand on the customer's phone.** Not theirs.
3. **You own the customer data.** Marketing, repeat orders, your loyalty program later.

Setup is one weekend. I do it. You start taking orders Monday."

## Common follow-up questions and answers

```
   Q: "What if my rider's phone dies during delivery?"
   A: "Admin sees rider go offline; you call them. Same as Swiggy's experience
       — they don't have telepathy either."

   Q: "Can my staff use it without training?"
   A: "Yes. Tap-driven. You're already operating it after watching once."

   Q: "Returns / refunds?"
   A: "v1 has cancellation up to 'cooking started' as a toggle. Refunds beyond
       that are operator-managed via Cashfree dashboard. Automated refund flow
       is a v2 ad-on."

   Q: "How much per month?"
   A: [Your pricing here]
```

## Known sharp edges to disclose proactively

- Cashfree sandbox mode is what's live today. Production needs full KYC (~1 week).
- Rider APK works through screen lock but Xiaomi/Oppo battery savers may need
  whitelist tips on first install. Setup guide is built into the app.
- Live tracking shows straight-line ETA, not routing-engine ETA. Acceptable in
  v1; routing-engine ETA is a v2 ad-on.
- Push notifications (rider gets a buzz when assigned) is a v2 ad-on. v1 polls.
