# Design decision log — Friends & social (and the board games to follow)

Every element below was presented as a gallery of ten genuinely different designs with one
recommendation, and nothing was built until the owner approved a design. The approved design is the
reference for everything that touches that element; later elements reuse its choices (the royal
court theme: antique wood, gold bevels, parchment text, Cinzel/Marcellus-style headings).

| # | Element | Approved | Notes that bind later work |
|---|---------|----------|----------------------------|
| 1 | Mobile login and OTP | Existing screen kept; functional improvements only | Country-code picker (+91 default), 5-minute OTP expiry, 5 wrong attempts return to the phone step, clear network errors. Online play and the Friends tab need a login; a logged-out visitor to Friends sees a gist of what friends can do plus a Log in button. |
| 2 | Username selection | Design 1 (Royal court) | Nameplate preview, gold-bordered field, live availability, suggestions when taken. 3–20 chars, letters/digits/underscore, unique case-insensitively, reserved words refused. |
| 3 | Avatar gallery | Design 1 layout | The *artwork* was not approved: the owner wants 20 premium comic/anime PNGs (`avatar_01_focused_strategist.png` … `avatar_20_mature_mentor_female.png`, 1024², coloured backgrounds) generated from their prompt. Picker is wired to those names; numbered discs show until the files are dropped in. |
| 4 | Find people (search and results) | Design 1 | Username prefix search and opt-in phone-contact matching; one `PersonRow` shared with every list. |
| 5 | Friend request cards | Design 1 | Incoming / sent sections; Accept, Decline, Cancel; every change goes through the pure `Relations.apply` state machine. |
| 6 | Friends tab layout | Design 1 | Tab next to Entertainment; Friends / Online / Requests / Find sub-tabs; gate screen when logged out. |
| 7 | Friend profile page | Design 1 | Nameplate hero with gold ring, presence line, facts plaques, Play request / Poke, Remove / Block / Report with confirmation. |
| 8 | Online / available / full / offline indicators | Design 1 | Green dot + gold medallion (👉 available, ✋ full); 25 s heartbeat, 60 s online window; appear-offline flag honoured everywhere. |
| 9 | Play request flow | Design 1 | Card with 60 s timer bar for the receiver, banner for the sender; answered once, server-validated; accepted → the right lobby opens. |
| 10 | Spectator mode and joining the next round | Design 1 | Same antique table, gold "Watching" pill, ribbon "You'll take a seat when this round ends · N tricks left" with Leave. Redacted views (no hidden card ever reaches a watcher), seat at the round boundary into the lowest computer seat, first come first served, up to four watchers. |
| 11 | Predefined messages and reactions | *awaiting approval* | |
| 12 | Notification bell and centre | pending | |
| 13 | Poke button | pending | |
| 14 | Poke animation | pending | |
| 15 | Poke settings | pending | |
| 16 | Profile management | pending | |
| 17 | States (loading / empty / error) | pending | |

Galleries are kept outside the repository (they are review material, not product code); the approved
design is described here and in the README section of each feature.
