# 09 – Main dashboard and navigation

Follows `00-canon.md`. Related: `03-miniverse-map.md` (world layout), `10-interactive-object-map.md`
(what objects do), `11-eight-sections.md` (what the tabs contain), `12-age-adaptive-interface.md`
(Little mode vs Explorer mode), `19-parent-dashboard.md` (behind the gate).

## 1. Principle: the Miniverse is the dashboard

DADU has no "home screen" in the conventional sense. When a child opens the app they are standing
on Dadaji's veranda, in the Miniverse, with Dadaji, Gopu and whichever animal is nearby. Everything
the child can learn is reachable in two ways that always coexist:

1. **Exploration** – walk into a room, tap an object, and the object's lesson begins
   (`10-interactive-object-map.md`).
2. **The illustrated tabs** – a hand-drawn tab strip (Little mode) or a curved shelf of cards
   (Explorer mode) that lists the eight learning sections plus Stories, Tests and Challenges,
   My Achievements and the Parent Dashboard.

Both routes lead to the same lesson records. A lesson started from the Academic tab plays in the
living room; a lesson started by tapping the globe in the living room is recorded under Academic.
There is one content graph and two doors into it.

Rule: **every piece of content must be reachable from the tabs without exploring**. A child who
prefers lists, a child with a motor impairment, or a parent in a hurry must never be forced to walk
through the world. The reverse also holds: no tab opens a flat "course catalogue"; a tab always
drops the child into a Miniverse location with Dadaji waiting.

## 2. The twelve dashboard entries

| # | Key | Label (en) | Label (hi) | Colour token | Lands in | Little mode | Explorer mode |
|---|---|---|---|---|---|---|---|
| 1 | `academic` | Academic Learning | पढ़ाई | `indigo` | `house.living_room` | Yes (icon only) | Yes |
| 2 | `stem` | STEM and Technology | विज्ञान और तकनीक | `monsoon` | `house.lab` | A2 only | Yes |
| 3 | `music` | Music and Performing Arts | संगीत और कला | `rose` | `house.music_room` | Yes | Yes |
| 4 | `art` | Art and Creativity | चित्रकला | `plum` | `house.art_room` | Yes | Yes |
| 5 | `sports` | Sports and Fitness | खेल-कूद | `clay` | `town.public_garden` | Yes | Yes |
| 6 | `nature` | Nature and Life Skills | प्रकृति और जीवन | `peepal` | `house.garden` | Yes | Yes |
| 7 | `mind` | Cognitive and Social Skills | सोच और दोस्ती | `saffron` | `house.playroom` | Yes | Yes |
| 8 | `explore` | Knowledge and Exploration | खोज | `marigold` | `town.excursions` | A2 only | Yes |
| 9 | `stories` | Stories | कहानियाँ | `clay` (book motif) | `house.study` | Yes | Yes |
| 10 | `tests` | Tests and Challenges | परीक्षा और चुनौती | `indigo` (star motif) | `house.living_room` | Hidden (A0–A1), "Play and show" (A2) | Yes |
| 11 | `achievements` | My Achievements | मेरी उपलब्धियाँ | `marigold` | `house.playroom` trophy shelf | Yes (simplified) | Yes |
| 12 | `parents` | Parent Dashboard | माता-पिता | `inkSoft` (lock motif) | Parental gate | Small, corner | Small, corner |

Little mode shows at most six tab tiles at a time (two rows of three, swipeable to a second page);
A0 Lap mode shows no tabs at all, only the world and a parent corner. Explorer mode shows all
twelve as a scrolling shelf.

Every tab tile is a hand-drawn illustration (the section motif from the canon drawn as a small
object sitting on a wooden shelf), not an icon in a circle. Tiles have a 72 pt minimum height in
Little mode and 56 pt in Explorer mode.

## 3. Wireframes

### 3.1 Little mode (A1–A2), portrait phone

```
┌──────────────────────────────────────────┐
│ (parent)                    * 12   (mute)    │  ← parent corner (gated), stars, mute
│                                          │
│   ╭──────────────────────────────────╮   │
│   │        MINIVERSE VIEWPORT        │   │
│   │   veranda · Dadaji waving        │   │
│   │   Gopu on the swing              │   │
│   │   Mitthu on the rail             │   │
│   │   [door: living room]  [garden→] │   │
│   │                                  │   │
│   │   Dadaji speech bubble (audio,   │   │
│   │   one picture, no text)          │   │
│   ╰──────────────────────────────────╯   │
│                                          │
│   ┌────────┐ ┌────────┐ ┌────────┐       │
│   │ slate  │ │ tabla  │ │ brush  │       │  ← six illustrated tiles, 72 pt,
│   │Academic│ │ Music  │ │  Art   │       │    labels read aloud on tap-and-hold
│   └────────┘ └────────┘ └────────┘       │
│   ┌────────┐ ┌────────┐ ┌────────┐       │
│   │  ball  │ │sapling │ │ puzzle │       │
│   │ Sports │ │ Nature │ │  Mind  │       │
│   └────────┘ └────────┘ └────────┘       │
│          ● ○            (page dots)      │
└──────────────────────────────────────────┘
```

Page two of the tiles: Stories, Achievements, and (A2 only) STEM and Explore.

### 3.2 Explorer mode (A3–A5), portrait phone

```
┌──────────────────────────────────────────┐
│ Dadaji's house ▾     * 240  o 85  (bell) (parent) │  ← location, stars, coins, notices, parent
│ ┌──────────────────────────────────────┐ │
│ │ Today with Dadaji                    │ │  ← Dadaji's plan strip (collapsible)
│ │ ● Fractions with Molly   12 min  ▶   │ │
│ │ ○ Story: The Blue Jackal  8 min      │ │
│ │ ○ Real world: water the tulsi        │ │
│ └──────────────────────────────────────┘ │
│ ╭──────────────────────────────────────╮ │
│ │          MINIVERSE VIEWPORT          │ │
│ │  living room · objects glow softly   │ │
│ │  minimap ◱ (top right)               │ │
│ │  Dadaji: "Beta, the telescope is     │ │
│ │  waiting for a clear night…"         │ │
│ ╰──────────────────────────────────────╯ │
│ ◀ ╔══════╗╔══════╗╔══════╗╔══════╗╔═══ ▶ │
│   ║Acade-║║ STEM ║║Music ║║ Art  ║║Spo   │  ← curved wooden shelf, 56 pt cards,
│   ║ mic  ║║      ║║      ║║      ║║      │    horizontal scroll, 12 cards
│   ╚══════╝╚══════╝╚══════╝╚══════╝╚═══   │
└──────────────────────────────────────────┘
```

Landscape tablets show the shelf on the right as a vertical bookcase and the plan strip as a
notebook on the table.

## 4. First-run flow

```
Install
  │
  ▼
[1] Language selection  ──────── mandatory, first screen, no account yet
  │   14 language tiles with the language written in its own script and spoken aloud
  │   on tap. Nothing else on the screen. Choice is stored on device immediately.
  ▼
[2] Dadaji's welcome (30 s)  ─── Dadaji, Gopu and Mitthu on the veranda; Dadaji speaks in
  │   the chosen language. Skippable by the parent only (hold 2 s).
  ▼
[3] Parental gate  ───────────── "Grown-up, please": solve a spoken multiplication, or
  │   enter the parent PIN once one exists.
  ▼
[4] Parent account + consent ─── phone or email sign-in (reuses the existing auth module),
  │   DPDP verifiable parental consent: age confirmation, what is collected, what is not,
  │   photo-upload consent (off by default), analytics consent (off by default).
  │   Offline path: a local-only profile with no server account; consent still recorded locally.
  ▼
[5] Child profile  ───────────── nickname (never surname), age band (A0–A5) chosen by the parent
  │   from an illustrated row, difficulty (gentle / steady / stretch, default steady),
  │   home language and helper language, accessibility toggles. Up to six profiles.
  ▼
[6] Hand back to the child ──── Dadaji: "Gopu, meet our new friend!" Gopu runs in, the animals
  │   gather. Tutorial is diegetic: Dadaji asks the child to tap the swing, then the door.
  ▼
[7] First exploration ────────── the child is in the veranda; the first tap on any object or
      tile starts a lesson. The daily plan appears from the second day.
```

Re-opening the app later skips to step 7 for the last active profile. Changing language later is
done in the Parent Dashboard (`19-parent-dashboard.md`) or from the language chip in the parent
corner; it does not require a reinstall.

## 5. "Today with Dadaji" – the daily plan

A small, collapsible strip (Explorer) or Dadaji's spoken suggestion (Little) that proposes three
things for today, generated on device from the child's progress:

| Slot | Source | Rule |
|---|---|---|
| Learn | `lessons` module | Next lesson in the subject with the most recent activity, or a weak concept flagged by `16-assessment.md` mastery data |
| Enjoy | `stories` or `music`/`art` | Rotates daily; never the same collection two days running |
| Do | `assignments` module (Real World Adventures) | One pending real-world assignment tied to a lesson completed in the last seven days |

The plan is a suggestion, never a lock. Completing it earns a "Dadaji's smile" sticker, not a
streak counter (`00-canon.md` section 8 forbids manipulative streaks). Missing a day has no
consequence and is never mentioned.

Mitthu's Echo is scheduled here too: if the child has completed three lessons since the last
revision, the plan adds a fourth optional slot, "Mitthu wants to repeat something".

## 6. Navigation rules

1. **Two-tap rule.** Any lesson, story, test or assignment is reachable in at most two taps from
   the dashboard (tab → item), plus one confirmation in Little mode.
2. **Always a way back.** A persistent "Dadaji's house" button (a small house icon, bottom left)
   returns to the veranda from anywhere. In Little mode it is the only global control.
3. **No dead ends.** Every screen ends with Dadaji suggesting what to do next, with at most three
   choices.
4. **Tabs land in the world.** Opening a tab moves the camera to that section's host location,
   with Dadaji there, and shows the section's topic list as objects in that room plus a scroll
   list below (Explorer) or a picture carousel (Little).
5. **Exploration never breaks a lesson.** Entering a lesson locks world navigation until the
   lesson ends or the child taps "Stop for now" (which saves the step and returns to the room).
6. **Back is safe.** The system back gesture always goes to the enclosing room, never exits the
   app without a parent-gated confirmation.
7. **Nothing opens a browser.** No external links are reachable from the child surface.
8. **Unlocks are additive.** New areas (`03-miniverse-map.md`) appear as fenced plots or closed
   doors with Dadaji explaining how to open them; locked content is never a paywall message shown
   to the child.

## 7. The parental gate

The gate protects: Parent Dashboard, account, subscription, photo uploads, data export and
deletion, language change, age-band change, external links, and app exit confirmation.

| Method | Default | Notes |
|---|---|---|
| Spoken arithmetic | On, first run | "Say or type: what is 7 times 8?" Three attempts, then 60 s cool-down. Numbers are two-digit products, never shown as text in Little mode (spoken only), to defeat guessing by pre-readers. |
| Parent PIN | Set during step 4 | 4–6 digits; replaces arithmetic once set. Stored hashed on device (`expo-secure-store`, reused from the existing app). |
| Biometric | Optional | Device biometric if the parent enables it; falls back to PIN. |
| Hold-to-open | Little mode only | The gate button must be held for 2 seconds before the challenge appears, which filters accidental taps by toddlers. |

The gate is a modal with a calm adult visual style (no cartoon chrome) so children recognise it as
"not for me". Gate successes are not analytics events; gate failures are counted locally only to
drive the cool-down.

## 8. State persistence

| State | Where | Scope |
|---|---|---|
| Chosen language, last profile | Device (settings store, reused) | App |
| Child position in the world, camera, time of day | Device (`miniverse` module) | Per profile |
| Lesson in progress (step index, answers so far) | Device, synced to API when online | Per profile |
| Garden growth, decorations, inventory | Device, synced | Per profile |
| Mastery, attempts, stars, coins, badges | Device, synced (server is source of truth when signed in) | Per profile |
| Screen-time counters | Device (authoritative, cannot be reset by the child) and synced for reports | Per profile per day |
| Daily plan | Computed on open, cached for the day | Per profile |

Sync uses the delta endpoints in `18-api.md`. Offline-only (no server) installs keep everything
on device, as the existing Tame app already does.

## 9. Accessibility of the navigation

- Every tile and object has an accessibility label and a spoken name (tap-and-hold in Little mode,
  screen reader in both modes).
- Reduce-motion turns off parallax and ambient loops; tiles stop bobbing.
- High-contrast theme thickens outlines and raises text contrast to 7:1.
- Font scale: the shelf reflows to two rows when the OS font scale exceeds 1.3.
- "Simple navigation" switch (Parent Dashboard): hides the Miniverse viewport behind a single
  large "Explore" tile and shows only the tab list, for children who find the world overwhelming.
- Audio instructions for every control are available in all fourteen languages; captions follow
  the caption setting.
- Focus order for switch access: parent corner → plan → viewport objects (left to right, near to
  far) → tabs → home button.
