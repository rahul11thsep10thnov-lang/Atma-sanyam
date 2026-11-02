# DADU – What needs your approval before full-scale implementation

The master prompt asks for approval of the visual identity, the characters and the navigation
before coding starts. This page lists every decision that is waiting for a yes, a no, or a change.
Open the prototype (`prototype/dadu/index.html`, also published as an artifact) alongside it.

## A. Visual identity

| # | Decision | Where to see it |
|---|---|---|
| A1 | "Living Picture Book" identity: warm paper backgrounds, hand-painted rounded shapes, soft 2.5D rooms, saffron primary action colour | Every prototype screen; `00-canon.md` section 4 |
| A2 | Type: Baloo 2 family for headings in every Indian script, Nunito / Noto Sans for body | Prototype wordmark and headings |
| A3 | Section colours and icon motifs for the eight learning sections | Prototype "Main dashboard" |
| A4 | Little mode (ages 2–6) and Explorer mode (ages 6–12) as the two interface treatments, with A0 Lap mode for 0–2 | Prototype age toggle and "Side by side" |

## B. Characters

| # | Decision | Where to see it |
|---|---|---|
| B1 | Dadaji's look: round spectacles, white hair and moustache, cream kurta with saffron and indigo border, white dhoti, saffron gamchha | Prototype "The seven characters" |
| B2 | Gopu's look: cowlick, yellow mango T-shirt, blue shorts, red sneakers, knee plaster; never assigned a gender in scripts | Same |
| B3 | Kim (tan-and-white Indian dog), Molly (grey rabbit with scarf and pencil), Dhanu (tan calf with tuft), Mitthu (green parakeet with slate-blue head) | Same |
| B4 | **The cow's name "Gauri" is a proposal.** The master prompt names every animal except the cow. Approve, or give another name, before any audio is recorded. | Same; `02-character-bible.md` |
| B5 | Mitthu's role is revision only ("Mitthu's Echo": repeats key clauses, Gopu repeats). Mitthu never teaches new material. | Prototype "Mitthu's Echo" and the last step of any lesson |
| B6 | Guest characters (a librarian "Leela Aunty", visiting specialists) always introduced and closed by Dadaji | `02-character-bible.md`, `07-public-library.md` |

## C. Navigation and the Miniverse

| # | Decision | Where to see it |
|---|---|---|
| C1 | The Miniverse is the dashboard: one continuous scroll-and-zoom world, plus an always-available map hub and illustrated tabs so nothing depends on exploring | Prototype "The Miniverse map", "Main dashboard"; `03-miniverse-map.md`, `09-main-dashboard.md` |
| C2 | House plot with the house on about 15 percent of it, so the garden is massive, with six fenced plots reserved for future animal shelters (goats, hens, horse, duck pond, bees, rescue) | Prototype map and "Private garden"; `04-house-floor-plan.md` |
| C3 | Thirteen rooms plus veranda and terrace, each with 6–12 interactive objects, 208 objects in total mapped to lessons | `05-room-designs.md`, `10-interactive-object-map.md` |
| C4 | Temple and cultural courtyard: optional, off by default for ages 0–4, every item labelled History / Mythology / Belief, with a separate Shared heritage wing | Prototype "Temple and cultural courtyard"; `08-temple-courtyard.md` |
| C5 | Bottom tabs: Miniverse, Learn, Stories (Little mode) plus Tests and Me (Explorer mode) | Prototype tab bar |

## D. Content and rights

| # | Decision | Where to see it |
|---|---|---|
| D1 | Launch story list uses only traditional and public-domain collections (60 stories); Malgudi Days, Ruskin Bond, Satyajit Ray and Grandma's Bag of Stories wait for licences | `13-story-library.md` |
| D2 | Voice strategy: human actors for Dadaji, Gopu and Mitthu in all 14 languages; animals human in English and Hindi, licensed neural voices elsewhere; OS text-to-speech only as accessibility fallback | `14-voice-audio.md` |
| D3 | Real-world assignments use four supervision tiers; photos optional, private, consent-gated, never a child's face required | `15-real-world-assignments.md` |

## E. Technical

| # | Decision | Where to see it |
|---|---|---|
| E1 | Reuse the existing repository (Expo 57 app, Express 5 + Drizzle + PostgreSQL API, Next.js 16 console); the Tame screens are retired at the end of Phase 1 | `01-product-architecture.md`, `21-roadmap.md` |
| E2 | Rive for characters and objects, Lottie for one-off effects, SVG/raster for environments, no three.js | `01-product-architecture.md` |
| E3 | SQLite on device for content packs and progress; base install under 60 MB with language and subject packs of 5–40 MB | `01-product-architecture.md`, `22-assets.md` |
| E4 | Children's age stored as band plus optional birth month, never a date of birth; five child profiles per account | `17-database-schema.md`, `19-parent-dashboard.md` |
| E5 | Ten-phase roadmap, about 58 weeks with the stated team; a closed soft launch is possible at week 26 | `21-roadmap.md` |
| E6 | Budget: about 10.3 crore INR (lean team, 18 months) or 11.7 crore INR (larger team, 12 months) to full release; operations 6 / 17 / 58 lakh INR per month at 10k / 100k / 1M monthly active children | `23-costs.md` |

## F. Naming already applied

The session, the project and the app are named **DADU** (`app.json` display name, `package.json`).
The bundle identifiers, icons and splash still carry the Tame assets and are replaced in Phase 1
once the identity above is approved.
