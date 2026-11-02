# 07 – The public library

The public library (`town.library`) is a large two-storey building on the main lane, under a
peepal tree, to the north-east of Dadaji's plot (`03-miniverse-map.md`). It is the Miniverse's
home for reading, reference and quiet exploration. Dadaji's own Story Corner lives in the house
(`13-story-library.md`); the public library is where the wider world of books is. Dadaji
accompanies Gopu and the companions on every visit.

## 1. Building

Hand-painted sandstone and lime-plaster building with a deep arched entrance, carved jharokha
windows, a reading courtyard with a peepal tree and a stone bench, and a small bell at the
door that Kim rings with his nose. Inside: warm wood, terracotta floors, brass lamps, rugs for
floor reading, and a spiral stair to the first floor.

```
 FIRST FLOOR
 ┌────────────────┬──────────────────┬───────────────────┬─────────────────┐
 │ history and    │ science and      │ biographies and   │ reference desk  │
 │ geography hall │ nature hall      │ world cultures    │ atlas, globe,   │
 │ (wall maps,    │ (specimen case,  │ (portrait wall)   │ dictionaries,   │
 │ timeline rug)  │ planet mobile)   │                   │ encyclopaedia   │
 ├────────────────┴──────────────────┴───────────────────┴─────────────────┤
 │ gallery over the picture-book hall · quiet reading nooks · audiobook  │
 │ listening booths (four, with big headphones)                           │
 └────────────────────────────────────────────────────────────────────────┘
 GROUND FLOOR
 ┌────────────────┬───────────────────────────────────┬────────────────────┐
 │ regional-      │ PICTURE-BOOK HALL                 │ Indian literature  │
 │ language       │ low shelves, cushions, a reading  │ and poetry hall    │
 │ books (14      │ tree with a hollow, a story rug   │ (Tagore, Premchand,│
 │ language       │ where the librarian reads aloud   │ Subramania Bharati,│
 │ alcoves)       │                                   │ Kabir, Meera …)    │
 ├────────────────┼───────────────────────────────────┼────────────────────┤
 │ world          │ ENTRANCE HALL                     │ borrowing counter  │
 │ literature     │ bell, shoe rack, notice board,    │ (library card,     │
 │ hall           │ "book of the day" easel           │ return basket)     │
 └────────────────┴───────────────────────────────────┴────────────────────┘
 COURTYARD: peepal tree, stone bench, Mitthu's branch, book cart, well
```

## 2. Sections and what they hold

| Section | Location ID | Content types | Age bands | Linked learning |
|---|---|---|---|---|
| Picture-book hall | `town.library.picture_hall` | Picture books, rhymes, wordless books, touch-and-tell | A0–A2 | Academic (early literacy), Stories |
| Children's books | `town.library.children_shelf` | Early readers, chapter books, comics | A2–A4 | Academic (reading), Mind |
| Indian literature and poetry | `town.library.indian_lit` | Public-domain Indian authors and poets, adapted; folk poetry | A3–A5 | Academic, Stories, Explore |
| World literature | `town.library.world_lit` | Public-domain world classics, adapted; folk tales of the world | A3–A5 | Academic, Explore |
| Science and nature | `town.library.science_hall` | Illustrated non-fiction, field guides, experiment books | A2–A5 | STEM, Nature, Explore |
| History and geography | `town.library.history_hall` | Timelines, maps, atlases, monument books, civics | A3–A5 | Academic (social studies), Explore |
| Biographies and world cultures | `town.library.bio_hall` | Lives of scientists, mathematicians, artists, athletes, explorers | A3–A5 | Explore, Mind |
| Reference | `town.library.reference` | Dictionaries in 14 languages, encyclopaedia, atlas, globe | A3–A5 | Academic |
| Audiobooks | `town.library.audio_booths` | Narrated books with page sync | A1–A5 | Stories, Academic |
| Regional-language books | `town.library.language_alcoves` | Books in each of the 14 launch languages, same titles across languages where possible | A1–A5 | Academic (languages), bilingual mode |
| Courtyard | `town.library.courtyard` | Read-aloud sessions, book cart, "guess the book" game | all | Stories, Mind |

The catalogue is content managed in the CMS (`20-admin-cms.md`). Every title carries rights
metadata (public domain, licensed with permission reference, original DADU commission) and is
blocked from publishing until the copyright verification step passes.

## 3. The librarian (guest character)

**Leela Aunty** is the librarian: a brisk, kind woman in a cotton sari with a pencil in her
bun. She is a guest character under the canon's rules (`02-character-bible.md`):

1. Dadaji introduces her on the first visit and remains on screen for the whole visit.
2. She never teaches; she recommends, finds, reads aloud at the story rug, stamps the library
   card and reminds about returns.
3. Dadaji explains anything educational that comes up ("Leela ji has found a book about
   volcanoes; let me tell you what a volcano is before we open it").
4. She is the only guest in the library; no other adults appear.

## 4. Borrowing and reading mechanics

- **Library card.** Earned on the first visit (a hand-drawn card with Gopu's name and chosen
  avatar sticker). Little mode: the card is a picture; Explorer mode: it shows books out, due
  "days" and reading stars.
- **Browsing.** Shelves are scrollable at Z2; book spines are tappable; tapping shows the cover,
  a one-line blurb read by Dadaji, the reading level and the languages available.
- **Borrowing.** Up to three books at a time (Little mode: one). Borrowed books travel to the
  bedroom story shelf and the study desk, so they can be read at home.
- **Reading.** The same reader as the Story Corner: read-along with highlighted text and audio,
  independent reading, bedtime mode. Non-fiction titles add "Dadaji explains" callouts on
  pages with a new concept.
- **Returning.** Books return themselves after seven in-world days; Leela Aunty's reminder is
  gentle and there are no fines. Returning in person earns a stamp on the card.
- **Reading stars.** Finishing a book awards a star; five stars in a hall unlock a new shelf.
  Nothing is lost by not reading.
- **Book of the day.** The entrance easel shows a daily pick chosen from the CMS calendar and
  from the child's recent lessons (a lesson on magnets suggests the magnet book).

## 5. Reading levels

DADU uses six reading levels aligned to the age bands but assigned by demonstrated reading, not
age (`12-age-adaptive-interface.md`):

| Level | Typical band | Text | Support |
|---|---|---|---|
| R0 Listen | A0–A1 | No text or single words | Full narration, picture tap |
| R1 Picture words | A1–A2 | 1–5 words per page | Narration with word highlighting |
| R2 Early reader | A2–A3 | Short sentences, phonics-controlled | Tap any word to hear it |
| R3 Confident reader | A3–A4 | Paragraphs, chapter books | Word meanings on tap, Dadaji explains |
| R4 Fluent | A4–A5 | Longer chapters, non-fiction | Glossary, comprehension prompts |
| R5 Independent | A5 | Abridged classics, essays | Discussion questions, writing prompts |

A parent can pin a level; otherwise the assessment engine (`16-assessment.md`) moves it.

## 6. Connections

- **Story Corner.** The sixteen collections of `13-story-library.md` are shelved in the house.
  The public library holds everything else and cross-shelves the Story Corner titles in the
  Indian-literature hall so that a child who discovers Panchatantra here is sent home to
  Dadaji's reading room for the full narrated version.
- **Academic Learning.** Reading, comprehension, vocabulary and grammar lessons send the child
  to a matching shelf for practice; the reference desk is the dictionary used in language
  lessons.
- **Knowledge and Exploration.** Each excursion (museum, forest, ocean, space) has a shelf
  here, and the biographies hall is the home of the scientists, artists and athletes topic.
- **Languages.** The 14 language alcoves are where bilingual mode shines: the same picture book
  in two languages, side by side.

## 7. Interactive objects

| Object ID | Interaction | Learning objective | Bands |
|---|---|---|---|
| `town.library.bell` | Kim rings it; door opens | Greeting and library manners | all |
| `town.library.notice_board` | Tap pins | Today's events, festival reading lists | A3+ |
| `town.library.book_easel` | Tap | Book of the day | all |
| `town.library.library_card` | Tap | Borrowing status, stamps | A2+ |
| `town.library.reading_tree` | Tap hollow | A hidden picture book each day | A0–A2 |
| `town.library.story_rug` | Sit | Read-aloud by Leela Aunty, Dadaji comments | A1–A3 |
| `town.library.globe` | Spin | Countries, continents (Molly asks where India is) | A2+ |
| `town.library.wall_map_india` | Tap a state | State facts, language, festival | A3+ |
| `town.library.timeline_rug` | Walk along it | Indian and world history in order | A3+ |
| `town.library.specimen_case` | Tap | Leaves, feathers, shells, rocks | A2+ |
| `town.library.planet_mobile` | Tap | Planets in order; sends to the terrace telescope | A2+ |
| `town.library.portrait_wall` | Tap | Short biographies | A3+ |
| `town.library.dictionary` | Open | Word lookup in two languages | A3+ |
| `town.library.audio_booth` | Sit | Audiobook with page sync | A1+ |
| `town.library.language_alcove_<code>` | Enter | Books in that language; language comparison game | all |
| `town.library.book_cart` | Push | Shelving game: sort books by colour, size, letter, subject | A1–A4 |
| `town.library.peepal_tree` | Tap | Tree identification, Mitthu's perch and Echo | all |
| `town.library.well` | Tap | Water and pulleys (STEM crossover) | A3+ |

## 8. Little mode versus Explorer mode

| Aspect | Little mode (A0–A2) | Explorer mode (A3–A5) |
|---|---|---|
| Visible areas | Picture-book hall, story rug, reading tree, courtyard | Whole library |
| Navigation | Dadaji walks the child to the rug or the tree | Free browsing, search by title, author, topic, language |
| Book choice | Five covers at a time, audio titles | Shelves, filters, reading level badges |
| Borrowing | One picture book, auto-returned | Three books, library card, stamps |
| Reading | Narrated only, tap pictures for sounds | Read-along, independent, glossary, questions |
| Librarian | Reads aloud only | Recommends, finds, reminds |
| Sound | Quiet rustles, Mitthu outside | Same, plus page turns |

## 9. Accessibility and safety

Captions on every narration; dyslexia-friendly font option; text-to-speech on any page; high
contrast mode swaps the warm wood for a cream reading surface; no outside links; no
user-generated reviews; the library never shows anything a parent has restricted in the
content controls (`19-parent-dashboard.md`).

## 10. Launch catalogue outline

The library opens with a catalogue that needs no licensing, so that rights work for the Story
Corner (`13-story-library.md`) never blocks the library. Counts are targets for Phase 6.

| Hall | Launch titles | Source |
|---|---|---|
| Picture-book hall | 40 | Original DADU commissions (rhymes, counting books, first words in 14 languages) |
| Children's books | 30 | Original early readers written to the phonics sequence of Academic Learning |
| Indian literature and poetry | 25 | Public-domain adaptations: Tagore, Premchand, Sukumar Ray, Subramania Bharati, Kabir, Meera, Tulsidas, Thiruvalluvar (selected couplets), folk poetry |
| World literature | 20 | Public-domain adaptations: Aesop, Grimm, Andersen, Kipling's Jungle Book, Alice, Gulliver, Arabian Nights (selected) |
| Science and nature | 25 | Original non-fiction tied to the lab and garden lessons; field guides to trees, birds, butterflies of India |
| History and geography | 20 | Original: Indus Valley, Ashoka, Chola ships, Mughal gardens, the freedom movement, Indian states, continents, oceans |
| Biographies | 20 | Original short lives: Aryabhata, Bhaskara, Ramanujan, C. V. Raman, Jagadish Chandra Bose, Kalpana Chawla, A. P. J. Abdul Kalam, Lata Mangeshkar, Bismillah Khan, Milkha Singh, P. T. Usha, Mary Kom, Amrita Sher-Gil, Marie Curie, Ada Lovelace, Leonardo da Vinci, Jane Goodall and more |
| Reference | 14 dictionaries, 1 atlas, 1 encyclopaedia | Original, built from the lesson glossaries |
| Audiobooks | 30 | Narrated versions of the above |
| Regional-language alcoves | the same 40 picture books in all 14 languages | Translation and proofreading pipeline (`14-voice-audio.md`, `20-admin-cms.md`) |

Each title's record stores the reading level, the languages, the hall, the rights status and
the lessons it supports, so that the book of the day and the lesson-to-shelf links are
data, not code.
