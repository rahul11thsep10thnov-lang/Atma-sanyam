# Third-party notices

## Fonts

Bundled under `app/src/main/res/font/`, all licensed under the SIL Open Font License 1.1
(full text in `licenses/fonts/`):

- **Cinzel** (`cinzel_variable.ttf`) — Copyright 2020 The Cinzel Project Authors.
  Source: https://github.com/google/fonts/tree/main/ofl/cinzel
- **Marcellus** (`marcellus_regular.ttf`) — Copyright 2012 Brian J. Bonislawsky DBA Astigmatic.
  Source: https://github.com/google/fonts/tree/main/ofl/marcellus

- **Noto Sans** (`noto_sans_{regular,medium,semibold,bold}.ttf`) — Copyright 2022 The Noto Project
  Authors (https://github.com/notofonts/latin-greek-cyrillic).
- **Noto Sans Devanagari** (`noto_sans_devanagari_{regular,medium,semibold,bold}.ttf`) — Copyright 2022
  The Noto Project Authors (https://github.com/notofonts/devanagari).

Cinzel and Marcellus were fetched from Google's `google/fonts` GitHub repository, which mirrors Google
Fonts under its original open-source license, and are unmodified. The eight Noto files are Google Fonts'
static weights **reduced to the characters the app uses** (Latin, Latin-1/Extended-A, punctuation, ₹, and the
Devanagari block with its OpenType layout tables intact) to keep the app small; no glyph was redrawn. The
OFL permits this, and Noto has no Reserved Font Name.

## Audio

- **Card sound effects** (`app/src/main/res/raw/sfx_*.wav`) — the eight WAV clips of the supplied
  `card_game_sfx_pack`: procedurally synthesised placeholder effects (not field recordings), used as
  provided. Check the pack's own terms before shipping commercially.
- **Background music** — *Surreal Forest* by **Meydän**, licensed **Creative Commons Attribution 4.0
  (CC BY 4.0)**. Source page: https://www.chosic.com/download-audio/30330/ — artist:
  https://linktr.ee/meydan — licence: https://creativecommons.org/licenses/by/4.0/.
  CC BY allows commercial use, redistribution and modification **provided the artist is credited**;
  the app shows the credit in its sound panel and Settings (`audio_credit` string). The source page
  asks for this credit text: "Surreal Forest by Meydän · https://linktr.ee/meydan · Music promoted by
  https://www.chosic.com/free-music/all/ · Creative Commons CC BY 4.0 ·
  https://creativecommons.org/licenses/by/4.0/". Confirm the terms on the page again before release.
  **The MP3 is not bundled in the repository yet** — see "Sound and music" in the README.
