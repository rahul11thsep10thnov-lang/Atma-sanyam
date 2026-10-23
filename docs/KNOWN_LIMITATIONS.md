# Known limitations and what has not been verified

Everything listed in the README is implemented and exercised by automated tests or the browser
smoke scripts, **except** as noted here. Nothing below is hidden behind a mock that pretends to
work.

## Needs real accounts to verify (cannot be done from this repository)

| Area | What is built | What is unverified |
|---|---|---|
| **Google Play Billing** | Purchase token verification through the Play Developer API (`purchases.subscriptionsv2`), real-time developer notifications (Pub/Sub push with a URL token), restore/acknowledge, the full state machine, client purchase flow with `expo-iap` | Never run against a real Play Console app: needs the app published to a testing track, a service account and a subscription product `loji_monthly`. Tests cover the state machine and webhook handling with recorded payload shapes. |
| **Razorpay (website)** | Subscription create/confirm with checkout signature verification, webhooks with secret, cancel | Never run against a live Razorpay account; the SDK is loaded from Razorpay's CDN on the web. |
| **SMS OTP delivery** | MSG91 and Twilio senders, console sender for development, fixed-code test numbers | Live delivery not verified; DLT template approval (India) is an account step. |
| **Push notifications** | Expo push tokens, admin notifications, dead-token pruning | Needs EAS project + FCM key. |
| **iOS** | The app builds for iOS and the subscription screen explains that purchases are made on Android or the website | App Store in-app purchase is **not** implemented (the spec targeted Google Play). Apple requires IAP for digital subscriptions sold in the iOS app, so an iOS store release needs StoreKit work before submission. |

## Product limitations

- **Sandbox billing** (`BILLING_SANDBOX=true`) is refused in production; it exists for tests and
  local development only.
- **Facts starter library**: 46 facts were written for this build from well-established
  knowledge and each cites a publisher page. They are seeded as published so the feature works
  on a fresh install. An editor should re-check each against its source before launch; the
  console's workflow (draft → verified → published) is the tool for that.
- **Craft diagrams** are schematic vector drawings, not photographs. The hard models (frog,
  crane) are harder to follow than a video; the library is designed for editors to add steps.
- **Narration** uses the device's text-to-speech voices (`expo-speech`); quality varies by
  device and language. No recorded audio is bundled.
- **Hindi**: the UI chrome is translated; game copy, facts and crafts are English only
  (the schema has `translations` columns and the admin editors accept them).
- **Live mirror** sends the serialised game state, not pixels: a game whose view cannot be
  rendered read-only shows its status line instead. Frames are throttled to ~2/s.
- **Offline**: the Player Console caches the catalogue, progress and the last facts and crafts
  it saw; games are bundled so they run offline, but a play session needs the server to start
  (limits are enforced server-side), so starting a game offline is not possible; the last known progress is shown read-only. A subscription is
  honoured offline only until its `validUntil`.
- **Web**: the website is the same Expo app exported statically. Haptics are replaced by
  WebAudio tones; drag-and-drop uses pointer events through `PanResponder`.
- **Analytics** are first-party, coarse and event-based (no third-party SDKs, no advertising
  identifiers), by design for the Families policy.

## Source registry and fact ingestion (see SOURCE_REGISTRY.md)

- **No source has been verified live.** The development sandbox cannot reach the third-party sites, so the registry was exercised against recorded pages and a simulated network, and a real run there ended with every content source `verification_failed` (DNS blocked) and nothing approved. The first run on a host with outbound HTTPS is what verifies licences; until then no ingested fact can reach a child.
- **The evidence rules are only as good as the page wording they look for.** Each rule (the strings in `src/catalogue/sourceRegistry.ts`) was written from knowledge of the publisher's terms, not from reading the live pages today. If a page is worded differently, the source simply stays `pending_review`, which is the safe direction; a person can then approve it in the console.
- **Only one content connector exists** (Wikipedia article summaries, English with the Hindi Wikipedia summary when one exists). Other approved sources are registered and licence-checked, but facts from them still have to be written or imported by editors.
- **Automatic age review is a heuristic** (reading difficulty plus a blocklist), not a child-safety guarantee, which is why ingested facts are stored as `verified` and need an editor (and a quiz question) to publish unless `FACT_INGEST_AUTO_PUBLISH=true`.
- **Hindi text is not machine-translated.** It is the Hindi Wikipedia's own summary of the same topic, kept only if it passes its own checks; no AI translation is performed.
- **DNS rebinding** is mitigated by resolving and checking addresses before each request, but the final connection uses the system resolver; run the API with egress restrictions where possible.
- The editorial references behind the starter facts (Britannica, National Geographic Kids, BBC, and others) are **not free-licence sources**; they are cited as references only, and no content is copied from them.

## Learning academy, rewards, rankings and ads

- **Curriculum mappings are all `pending_review`.** The 50 seeded lessons name the NCERT/CBSE/
  CISCE/IB documents they were written against, but no mapping has been verified by a person
  yet, so no lesson shows "Aligned with the selected curriculum topic" until a fact checker
  verifies it in the console. This is deliberate: the label is a claim and the review is what
  earns it.
- **Lesson content was written by editors with the cited publisher pages as references**, like
  the facts library; each Did You Know? links its source. Re-check before launch.
- **Coverage is representative, not complete**: 50 lessons across 30 subjects and every age
  3–12, roughly 2–5 per core subject. Drums, flute and violin have no lessons yet and say
  "coming soon"; many subject/age cells are empty and the app says so rather than showing empty
  cards (see the console's coverage table).
- **Instrument and sports lessons cannot assess physical technique.** Practice activities check
  taps on the screen; every such activity and the Sports section say so. Swimming lessons are
  water-safety and vocabulary only and state that real swimming needs an in-person instructor.
- **Hindi**: lesson content is English except the Hindi स्वर lesson; the schema has a
  `translations` column and the editor accepts it.
- **Ads have not been shown anywhere.** There is no native build or AdMob account in this
  environment; the SDK path is implemented behind the native-only loader and must be exercised
  on a device build with real app/unit ids (the plugin currently carries Google's sample app ids).
  Ad-supported access is **off** by default; the subscription remains mandatory.
- **Rankings are global but small.** "Family favourites" on Home is an editorial list (no
  cross-household play statistics are collected). Leaderboards show nicknames; a guardian who
  wants a child off the boards switches rankings off per child.
- **Reward items are cosmetic placeholders** (emoji, colours); equipping an item is recorded
  (`children.equipped_rewards`) but is not yet reflected in game boards or avatars.
- **Pass-and-play** exists for Ludo, Snakes & Ladders and Chess only; it is on one device.

## Operational

- The cleanup job (`npm run cleanup`) must be scheduled (Render blueprint includes it) for
  expired sessions, OTPs, stale game sessions, deletion requests past their cooling-off period
  and retention of screen-time records.
- Database migrations run on API start; there is no zero-downtime migration tooling.
- The repository has no load tests; rate limits are per-instance (in-memory).
