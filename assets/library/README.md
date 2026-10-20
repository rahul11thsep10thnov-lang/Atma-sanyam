# Bundled picture library

206 pictures ship inside the app. `src/content/bundled.ts` lists them; the two
Himalayan photos are written by hand there, the rest come from
`src/content/bundledLibrary.generated.ts`, which `tools/library/build_library.py`
writes.

## Himalayan photos (2)

`001_mountains.jpg`, `002_mountains.jpg` (with `__medium` and `__thumb` sizes):
Vyacheslav Argenberg, CC BY 4.0, from Wikimedia Commons ("Sagarmatha Everest
Zone, Nepal, Himalayas" and "Himalayas, Nepal"), cropped. Details in
`CREDITS.csv`. The app shows this credit when one of them is used.

## Supplied landscapes (104)

`ls_NNN.webp` (1080 x 1920, WebP) and `ls_NNN_t.webp` (360 x 360 thumbnail). They
were supplied for the app as three zips of JPEGs (27, 50 and 30 pictures) with no
credits or licences. On 20 October 2026 the app's owner confirmed they hold the
rights to distribute them in the app.

- `ls_051` carries its own credit line (Copernicus Sentinel-2 imagery, European
  Union, processed by @DEFIS_EU); the app shows it as the picture's credit.
- Three pictures were left out on purpose and their numbers are unused: `ls_072`
  (a cropped title overlay), `ls_086` (a personal email address watermarked across
  it) and `ls_095` (a readable vehicle number plate).
- Kinds (mountain, lake, river, waterfall, valley, coast, forest, flowers, vintage
  print, bird, butterfly, animal) were set by hand in `build_library.py`; titles
  are built from them ("Lake 03", "झील 03").

## Inspirational quote cards (100)

`qt_NNN.webp` (1080 x 1920, WebP) and `qt_NNN_t.webp` (360 x 360 thumbnail of the
quote panel), under **Inspirational > Quotes**. They were supplied as a zip of 100
JPEG cards (`100_motivational_quotes_with_backgrounds_Cinderella.zip`); each had a
caption strip from a concept sheet baked into its bottom, which
`tools/library/build_quotes.py` crops away (top 2 %, bottom 14 %, sides to keep
9:16). No credits or licences came with the zip. On 20 October 2026 the app's
owner confirmed they hold the rights to distribute the cards in the app. The zip's
note says the quote attributions were not verified; that check is still the
owner's to make (a wrongly attributed quote is a content-accuracy issue, not a
licence one).
