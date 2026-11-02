# 19 – Parent dashboard and screen time

Follows `00-canon.md`. Related: `09-main-dashboard.md` (where the parent entry sits), `16-assessment.md`
(the numbers shown here), `15-real-world-assignments.md` (adventure unlock and photos), `12-age-adaptive-interface.md`
(difficulty and speed settings), `14-voice-audio.md` (audio settings), `17-database-schema.md`
(`parents`, `children`, `consents`, `screen_time_rules`, `usage_logs`), `18-api.md`.

## 1. Principles

- The parent is the account holder; the child never is. Every child profile belongs to one parent
  account, which may be shared by two guardians on separate devices.
- Everything about money, data, other people and the outside world sits behind the parental gate.
- Reports are plain language first, numbers second, and never rank the child.
- Screen-time limits are enforced kindly: Dadaji winds the session down, he does not slam a door.
- Each data-touching control states what is stored, where, for how long and how to delete it
  (Digital Personal Data Protection Act 2023, "DPDP", sections 5–9 and the children's-data rules).

## 2. Parental gate

The gate protects: the parent dashboard, purchases, account and data settings, adventure unlocks
and completions, photo uploads, external links, and leaving the app via any store page.

Design:

1. **Maths question** in words, chosen from a bank the child's band cannot read or solve
   ("Nineteen times four, written as digits"). Three attempts, then a 60-second pause.
2. **Parent PIN** (4–6 digits) set at account creation. Stored as a scrypt hash on the device
   (expo-secure-store) and on the server. Forgotten PIN resets through the parent's verified phone
   or email.
3. **Biometric** optional shortcut (device Face ID, fingerprint) that replaces the PIN, never the
   maths question on first use of the day.
4. The gate times out after 5 minutes of parent-area inactivity and always on returning to the
   Miniverse.

Little mode never shows the parent icon on the child's screens; the gate is reached from the top
corner of the veranda by a long press (A0–A2) or a small "Parents" tab (A3–A5).

## 3. Child profiles

- Up to **five** child profiles per parent account (more on request, with a reason, to avoid
  classroom misuse).
- Per profile: name or nickname (first name only, or a chosen name; no surname field), avatar
  (chosen from the app's own art, no photos), date of birth **month and year only** (enough for
  the age band; day is never collected), age band (derived, editable), difficulty level, primary
  language, helper language, interface mode override, accessibility settings, content
  restrictions, screen-time rules.
- A profile switcher on the veranda gate; the child picks their own avatar tile with no PIN.
- DPDP: name and birth month are the only identifying fields; both deletable; a profile with no
  activity for 24 months is flagged to the parent for deletion.

## 4. Age and difficulty settings

| Setting | Values | Notes |
|---|---|---|
| Age band | A0–A5, derived from birth month; parent may move one band up or down | Change takes effect at next app open; Dadaji says "I hear you have grown" to the child |
| Difficulty | gentle, steady, stretch | Independent of age; explanation text under each option |
| Narration speed | Very slow, slow, normal, fast, very fast | `14-voice-audio.md` |
| Lesson progression | same five steps | How quickly new topics are introduced |
| Animation speed | same five steps, plus "reduced motion" | |
| Interface mode | automatic (from band), Little, Explorer | Override for children whose needs differ from their age |

Every setting here is also reachable from the "Why this question?" sheet in a progress view.

## 5. Learning progress views

### 5.1 Overview (per child)

```
┌──────────────────────────────────────────────────────────────┐
│  ◀ Gopu  (7, Explorer, Steady)          This week  ▾   Export │
├──────────────────────────────────────────────────────────────┤
│  Dadaji says:                                                 │
│  "Gopu mastered counting to twenty and the parts of a plant.  │
│   Subtraction with borrowing needs a little more practice.    │
│   Try the Shadow clock adventure this weekend."               │
├───────────────┬───────────────┬──────────────────────────────┤
│  Lessons      │  Mastered     │  Time with Dadaji            │
│  12 this week │  5 concepts   │  2 h 10 min (limit 30/day)   │
├───────────────┴───────────────┴──────────────────────────────┤
│  By section                                                   │
│  Academic     ████████░░  Getting there   (18 concepts)       │
│  STEM         ███░░░░░░░  Just started     (3 concepts)       │
│  Music        █████░░░░░  Practising       (6 concepts)       │
│  Nature       █████████░  Mastered mostly  (11 concepts)      │
│  …                                                            │
├──────────────────────────────────────────────────────────────┤
│  Adventures completed  3   ·  Badges  7   ·  Garden plants 9  │
└──────────────────────────────────────────────────────────────┘
```

Bars show mean mastery per section with the concept count beside them; fewer than five concepts
shows "too early to say" instead of a bar.

### 5.2 Subject drill-down

```
┌──────────────────────────────────────────────────────────────┐
│  ◀ Academic › Mathematics                                     │
├──────────────────────────────────────────────────────────────┤
│  Concept                     State          Last 10   Next    │
│  Counting 1–20               Mastered       ●●●●●●●●●○  Dec 1 │
│  Addition within 20          Getting there  ●●○●●●○●●●  Nov 5 │
│  Subtraction with borrowing  Needs practice ○○●○○●○○●○  Nov 3 │
│  Shapes: 2D                  Just started   ●●○         Nov 4 │
├──────────────────────────────────────────────────────────────┤
│  12-week trend (mean mastery, Mathematics)                    │
│  ▁▂▂▃▃▄▄▅▅▅▆▆                                                 │
│  Why this question?  ▸                                        │
└──────────────────────────────────────────────────────────────┘
```

Each concept row opens the last ten answers with the prompt, the child's answer and Dadaji's
explanation. No percentile, no rank, no comparison with other children anywhere.

## 6. Screen-time management

### 6.1 Daily limits

| Setting | Values | Default |
|---|---|---|
| Daily limit | 15, 30, 45, 60 min, custom (5-min steps, up to 180), or none | A0–A1: 15; A2: 30; A3–A4: 45; A5: 60 |
| Weekday and weekend limits | separate values | same as daily |
| Bedtime schedule | start and end time per day; app shows only bedtime stories (audio) inside the window, or nothing | 20:30–06:30 |
| Break reminder | every 15, 20 or 30 min, or off | 20 min |
| Quiet hours for notifications | window | 20:00–08:00 |

### 6.2 Warnings and wind-down

```
limit − 5 min   Dadaji (in scene, no modal): "Five more minutes, beta. Let us finish this activity."
limit − 1 min   Mitthu: "One minute, one minute!" The current activity is allowed to finish (max 3 min).
limit           Dadaji sits on the veranda swing: "Time to rest the eyes. Shall I tell you what to
                do outside?" Shows two offline suggestions (an adventure, or "go and water a plant").
                The screen offers one tappable thing only: a Goodbye wave. No "ask for more time".
parent override Parent may add 10 or 15 minutes through the gate; counted in the report as "extra".
```

Break reminder: a 60-second Dadaji stretch or look-away moment, which pauses the timer and cannot
be skipped in Little mode (Explorer mode can skip after 20 seconds).

### 6.3 Reports

- **Daily**: minutes per section, number of breaks taken, limit reached or not.
- **Weekly report** (Sunday evening, push and in-app): total minutes, per-day bars, sections,
  "extra time" granted, adventures done, Dadaji's three sentences (section 5.1), one suggestion
  for offline play.
- Time is measured as foreground time with the child's profile active; audio-only bedtime
  stories are listed separately and do not count toward the limit.

DPDP: usage logs hold minutes per section per day only; no screen recordings, no per-tap logs
leave the device (product analytics are opt-in and anonymous, `01-product-architecture.md`).

## 7. Downloads and offline

- Per-language content packs by section and age band, with sizes before download
  (`14-voice-audio.md` for audio sizes).
- "Download Dadaji's plan for the next 7 days" one-tap.
- Wi-Fi only toggle; storage used; delete per pack; auto-delete packs for a band the child has
  left (asks first).

## 8. Language settings

- App language and audio language per child (may differ: Hindi UI, English lessons).
- Mode: single, bilingual (primary + helper), comparison, English with Hindi explanations, Hindi
  with English explanations.
- Script font size and dyslexia-friendly toggle apply per script.
- Changing languages re-downloads only the audio and text layers of already-downloaded packs.

## 9. Content restrictions

| Toggle | Default | Notes |
|---|---|---|
| Temple and cultural courtyard | Off for A0–A1, on for A2+ | `08-temple-courtyard.md`; per-area toggles inside (for example only the Shared heritage wing) |
| Specific sections | all on | Hide any of the eight sections from the Miniverse and tabs |
| Specific stories or collections | all on | Hide, for example, Vikram and Betaal for younger bands |
| Real-world adventures | on | Off hides the Adventures shelf; per-tier limits (for example only `self` and `nearby`) |
| Challenge and Olympiad tests | on from A3 | |
| Voice recording for oral answers | off | Requires consent screen; recordings on device only |
| Photo attachments | off until first consent | `15-real-world-assignments.md` section 4 |

## 10. Subscription management

- Shows the current plan (free tier, monthly, yearly, family), renewal date, store it was bought
  on, and a "Manage in Google Play / App Store" link behind the gate.
- No purchase surfaces are ever shown to a child. Locked content shows Dadaji saying "Ask your
  parents to open this room" with nothing tappable except Back.
- Restore purchases, invoices and cancellation are store-managed; the app never stores card data.

## 11. Account, privacy and deletion

| Control | What it does | DPDP note |
|---|---|---|
| Parent profile | Name, verified phone or email, PIN, biometric toggle, second guardian invite | Phone or email is the only parent identifier; verified by one-time code (reuse the existing SMS flow) |
| Consent record | Lists every consent given (account, child profile, photos, voice, analytics) with timestamps; each can be withdrawn | Section 6 (withdrawal as easy as giving) |
| Data export | ZIP with JSON (profiles, progress, mastery, adventures, badges) and the parent's photos, emailed as a link valid 24 h | Section 11 data portability |
| Delete a child profile | Removes the profile, progress, photos and garden; the parent gets a 7-day undo window; then hard deleted | Section 8(7) erasure |
| Delete the account | Deletes all child profiles and the parent record; subscriptions continue to be managed by the store; a 7-day undo window; then hard deleted, with backups purged within 30 days | Section 8(7); grievance contact shown |
| Analytics | Opt-in, anonymous product events, off by default for all child profiles | Rule 10 (no tracking or behavioural monitoring of children) |
| Notifications | Weekly report, adventure reminders, Dadaji's plan reminder, each separately; quiet hours | Consent per channel |
| Grievance and contact | Data Protection contact, response within the statutory window, in-app form | Section 8(10) |
| Legal | Terms, Privacy, Children's privacy summary in plain language in every launch language | Notice in the language the parent chose (section 5(3)) |

The app collects no location, no contacts, no device identifiers beyond a random install ID, no
third-party trackers and no advertising identifiers.

## 12. Settings and accessibility (full list)

Settings menu, reachable from the gate and, for the non-sensitive items, from a small Settings
sheet in Explorer mode:

| Group | Items |
|---|---|
| Language | App language, audio language, mode (section 8) |
| Learning | Learning speed, narration speed, lesson progression, animation speed, difficulty, interface mode |
| Sound | Music on/off and volume, sound effects, character voices, background music choice (flute, piano, santoor, sitar, veena, guitar, ambient, birds, garden, rain, night-time), duck music under dialogue (always on), mute all |
| Reading | Subtitles and captions on/off, caption size, font size (5 steps), reading mode (plain page, no animation, high contrast), dyslexia-friendly font, line spacing |
| Appearance | Automatic day/night in the Miniverse, bedtime mode colours, high contrast, reduced animation |
| Screen time | Section 6 |
| Parental controls | Gate, PIN, biometric, restrictions |
| Offline downloads | Section 7 |
| Notifications | Section 11 |
| Accessibility | Captions, text-to-speech of all on-screen text, adjustable fonts, high contrast, reduced animation, audio instructions for every button (Little mode always), simple navigation (hide the Miniverse, show only the tabs), dyslexia-friendly reading, switch and screen-reader labels on every control, colour-blind safe palettes (shapes plus colour everywhere) |
| Privacy | Section 11 |
| Account management | Section 11 |

Accessibility settings are per child profile and travel with the profile across devices.

## 13. Wireframe: parent home

```
┌──────────────────────────────────────────────────────────────┐
│  Parents                                       Settings  ⚙   │
├──────────────────────────────────────────────────────────────┤
│  [Gopu ▣]  [Meera ▣]  [+ Add child]                           │
├──────────────────────────────────────────────────────────────┤
│  This week with Dadaji                                        │
│  Mon ▂ Tue ▄ Wed ▃ Thu ▅ Fri ▂ Sat ▆ Sun ▁    2 h 10 m total   │
│  Daily limit 30 min · Bedtime 20:30 · Breaks every 20 min     │
├──────────────────────────────────────────────────────────────┤
│  Progress  ▸        Adventures  ▸        Downloads  ▸         │
│  Restrictions ▸     Subscription ▸       Privacy & data ▸     │
├──────────────────────────────────────────────────────────────┤
│  Dadaji's suggestion for the weekend                          │
│  "Shadow clock – 15 minutes in the sun, an adult nearby."     │
└──────────────────────────────────────────────────────────────┘
```

## 14. Phase plan

Phase 1 ships the gate, parent account, one child profile and language settings (needed for first
run). Phase 9 (`21-roadmap.md`) ships everything else in this document, with screen-time
enforcement tested on Android 10 budget devices in the manual checklist.
