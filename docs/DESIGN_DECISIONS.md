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
| 11 | Predefined messages and emoji reactions | Design 1 (Royal court) | Gold speech button at the table corner, parchment tray (10 phrases, 8 emoji, Mute row), parchment plaque beside the sender's nameplate for 3 s. Ids only, never free text; 1 per 2 s and 5 per 30 s; watchers emoji-only; no button on solo tables. |
| 12 | Notification bell and centre | Design 1 (Royal court) | Brass bell with crimson count in the top bar of Khel / Entertainment / Friends; parchment scroll drops from it, grouped New / Earlier, one inline action per line (Accept, Play, Poke back), × to dismiss, Clear all. Derived from relations and play requests plus posted notices; 7 days / 50 items; no bell when logged out. |
| 13 | Poke button | Design 1 (Royal court) | Crimson 👉 Poke in the profile action row; steel "Poked · 9:58" countdown after; parchment confirmation line. Friends only and only while online; 10-minute cooldown per friend, 20 an hour; `pokes/{from_to}` record; Poke back from the notification centre. |
| 14 | Poke animation | Design 1 (Royal court) | One 0.4 s page shiver, a gold 👉 taps twice mid-screen, a parchment banner drops under the top bar with avatar, name, "poked you" and Poke back; 5 s or tap to leave; banner only at a table; fade only under reduced motion. |
| 15 | Poke settings | Design 1 (Royal court) | A Pokes plaque on Settings under Sound and music: Receive / Sound / Vibration orb switches, segmented Who may poke me (All friends / Favourites / Nobody), Muted people chips with ×. Favourite star and mute from the friend row menu and the profile. Receive + audience mirrored to the profile; senders told politely. |
| 16 | Profile management | Design 1 (Royal court) | Own page from the top-bar account tab: nameplate hero with gold pencils (avatar → Element 3 gallery, name → Element 2 screen, 30-day rule, old names released after 30 days), Privacy / Notifications / Account plaques with orb switches, masked phone, Log out and Delete account with confirmations. |
| 17 | States (loading / empty / error / offline) | Design 1 (Royal court) | Skeleton rows with a slow gold shimmer; invitation empty states with one button; error plaque with the plain cause and Retry; hairline gold offline band with sends parked; failed actions as toasts; all states announced. |

All seventeen Friends elements are built and pushed. Galleries are kept outside the repository (they are review material, not product code); the approved
design is described here and in the README section of each feature.

## Ludo

| # | Stage | Approved | Notes that bind later work |
|---|-------|----------|----------------------------|
| 1 | Ludo tile in the Entertainment tab | Design 1 (Royal court, the Khel tile) | Gold-framed portrait (cross board on ivory, two tokens, a die), crimson plaque, one-clause summary, 2–4 players; tapping opens Ludo's own introduction page. Entertainment uses Khel's two-column grid. |
| 2 | Introduction and mode selection | Design 1 (the card games' setup page) | Portrait + two-line intro + Rules; mode slots; Players 2–4; AI difficulty; House rules plaque with orb switches preset to the recommended ruleset (six to enter, extra roll on six with three-six forfeit, extra roll on capture, exact finish, play on for places; star squares safe). The engine implements exactly these switches. |
| 3 | Board | Design 10 (Royal court, the card room's board) | Ivory on waxed walnut with a gold rim; suit-coloured yards with ivory nests; gold safe stars; coloured home columns; four-colour star under a gold medallion. Tokens carry suit symbols; stacks show counts; die and Roll below the board. Geometry shared by renderer and engine. |
| 4 | Tokens, dice, safe squares, homes, movement | Design 3 (Glide) | Die spins through faces and settles (gold flash on a six); tokens glide along an arc with a fading trail; captured tokens fly home shrinking; safe squares shine on landing; engine decides first, taps ignored and bots wait while moving; reduced motion snaps. |
| 5 | Avatars, usernames, turn indicators, scores | Design 1, modified: each plaque in its own yard | Avatar with colour ring and suit badge, username, four gold token pips, glow on the current player, place when finished; plaque centred in the player's yard between the nests; no row above the board. |
| 6 | Lobby and room creation | *awaiting approval* | |
| 7 | Friends invitation and play requests | pending | |
| 8 | Waiting, reconnecting, game-full states | pending | |
| 9 | Quick messages, reactions, sound controls | pending | |
| 10 | Results, statistics, rematch, return to lobby | pending | |
