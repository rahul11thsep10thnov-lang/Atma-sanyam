# DADU – Multiverse architecture

One registry, twelve doors, eight curricula. The twelve navigable domains ("worlds") are views over
the same content graph and the same world state; none of them owns a separate learning engine.

## 1. The registry

`src/dadu/core/worlds.ts` defines the twelve worlds. Each world declares:

- the learning **sections** it draws lessons from (`academic`, `stem`, `music`, `art`, `sports`,
  `nature`, `mind`, `explore`, from the same file);
- the **locations** it contains (`src/dadu/core/locations.ts`);
- the **companions** who usually accompany Dadaji there;
- the **interface modes** in which it appears (Lap, Little, Explorer) and whether it is
  parent-controlled (`optional`, used by the Wisdom Temple).

| World | Sections | Locations (ids) | Companions |
|---|---|---|---|
| Home and Family | nature, academic, mind | villa.veranda, villa.living, villa.kitchen, villa.dining, villa.bedroom_dadaji, villa.bedroom_chintu, villa.study, villa.activity, villa.bathroom, villa.terrace | Chintu, Buddy |
| Garden and Nature | nature, academic | garden.flowers, garden.vegetables, garden.fruit, garden.butterfly, garden.greenhouse, garden.pond, garden.fountain, garden.workshop, garden.compost | Gauri, Chintu |
| Animalia | nature, mind | animalia.dog, animalia.rabbit, animalia.cowshed, animalia.calf, animalia.wild | Buddy, Chikki, Gauri, Nandu |
| Academic Learning | academic | villa.study, villa.living | Chikki |
| STEM Lab | stem | villa.activity | Buddy |
| Creative Studio | art, music | villa.activity, villa.terrace | Chikki, Nandu, Mitthu |
| Sports and Fitness | sports | town.public_garden, villa.driveway, villa.terrace | Buddy |
| Storyland | academic, mind | villa.bedroom_chintu, town.library | Chintu, Chikki |
| Sanskriti | explore, art, music | town.bazaar, town.festival_ground | Gauri, Chintu |
| Wisdom Temple (optional) | explore | town.temple | Nandu |
| Discovery World | explore, academic | town.library, excursion.* | Chikki, Buddy |
| Play and Friendship | mind | villa.activity, town.public_garden | Buddy, Chikki |

## 2. How the pieces connect

```
                 ┌──────────────── content graph ────────────────┐
                 │ lessons · stories · assignments · objects     │
                 │ (src/dadu/content, served/updated by the CMS) │
                 └──────┬───────────────┬───────────────┬────────┘
   section ────────────►│               │               │◄──────── object id (location.object)
                        ▼               ▼               ▼
                   WORLDS registry   LOCATIONS       simulation + world state
                   (12 views)        (iso scenes)    (plants, animals, objects, positions,
                        │               │             rewards, mastery, progress)
                        ▼               ▼               ▲
                   World hub tiles   IsoScene taps ────┘ activity effects (engines/activities)
                        └──────── side-view activity (engines/lesson) ──────┘
```

- A **lesson** lives in exactly one section and is hosted by one object (`host`). The object sits in
  a location; the location sits in a world. The lesson therefore appears in: the section tab, the
  world hub, the location scene (as a glowing object), and the daily plan.
- A **real-world assignment** links back to its lesson and its section badge.
- An **activity** performed in a side-view scene mutates the shared `WorldState`
  (`src/dadu/core/worldState.ts`) through pure functions in `src/dadu/engines/activities.ts`; the
  isometric scene re-renders from the same state when the camera returns.
- **Cross-links** are derived, never stored: `worldsForSection(section)` lights up every world that
  teaches that section; `lessonForObject(objectId)` opens the lesson from any camera.

Examples required by the master prompt, as realised in the registry:

| Experience | Section(s) | World(s) | Host |
|---|---|---|---|
| Gardening in the private garden | nature | Garden and Nature | garden.vegetables.* |
| Measuring vegetables | academic (maths) | Garden, Home (kitchen) | villa.kitchen.scale |
| Cooking | nature (life skills), academic (maths), academic (science) | Home | villa.kitchen.* |
| Animal care | nature, mind (social) | Animalia | animalia.* |
| Tenali Raman story | academic (language), mind (reasoning) | Storyland | town.library.story_shelf |
| Museum visit | explore (history) | Discovery | excursion.museum |

## 3. Rules

1. No world may define content of its own; it references lessons by section and objects by id.
2. No world may hold state of its own; everything persists in the child's `WorldState`.
3. Every location belongs to exactly one world for navigation, but a lesson hosted there may belong
   to any section (the Creative Studio's harmonium teaches `music`, the same room's lab bench
   teaches `stem`).
4. The Wisdom Temple is optional, off by default below A2, and every item there carries the
   History / Mythology / Belief label (`08-temple-courtyard.md`).
5. Adding a world means adding one registry entry and its locations; no engine changes.
