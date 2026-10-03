# Content packs — filling the image library

The puzzle-image library (Home → library tile → categories) is served by the
API from the `categories` and `content` tables. Nothing is bundled in the app:
adding images is a database operation, and the app shows them on next launch.

## Triptoe India 450 (Wikimedia Commons)

`backend/content-packs/triptoe_india_450/manifest.csv` lists 450 search
queries in four collections:

| Collection | Categories | What |
|---|---|---|
| Hindu Temples & Deities | 28 states | statewise sacred places and deities |
| Mosques & Dargahs | 24 regions | mosques, dargahs, Islamic heritage |
| Gurdwaras | 12 regions | major gurdwaras |
| Landscapes of India | 9 themes | beaches, mountains, valleys, waterfalls, deserts, forests, sunrise/sunset, lakes & rivers, tea hills |

The ZIP the pack came in does not contain image files. `npm run
ingest:wikimedia` resolves each query against the Wikimedia Commons API,
keeps the largest bitmap of at least 1200×800 whose licence allows reuse
(CC0, CC BY, CC BY-SA, public domain — never NC or ND), and inserts one
**published** content row per query with Commons-hosted URLs at three sizes
plus full attribution (file, author, licence, source page). Categories are
created as `<collection>` → `<collection>-<region>`.

### Run it (from your laptop; it needs internet access to Commons)

```powershell
cd C:\focus\Atma-sanyam\backend
npm install
# one-time: put your Neon connection string in backend\.env
#   DATABASE_URL=postgresql://...
npm run ingest:wikimedia -- --dry-run --limit 5     # preview, no DB writes
npm run ingest:wikimedia                            # the whole pack (~450 API calls, a few minutes)
```

Options: `--collection Hindu|Islam|Sikh|Landscape`, `--limit N`, `--draft`
(insert as drafts for review in the admin console), `--manifest <csv>`,
`--report <csv>`. The run is idempotent: rows already ingested (tag
`ref:<manifest id>`) are skipped, so re-run after any interruption.

A `report.csv` next to the manifest lists every query with the chosen file,
licence and author, or the reason it was skipped. Expect some skips: not
every query has a large enough, freely licensed photo on Commons. Those are
the ones to source elsewhere or re-query with a different search string.

### Licensing and hosting notes

- Every row stores `creator`, `license`, `source` and an `attributionText`;
  the app shows it on the session screen for images that require it.
- CC BY-SA requires attribution and share-alike for *adaptations*. Showing
  the photo as a puzzle is display, not a derivative work you redistribute,
  but keep the attribution visible.
- Images are hot-linked from `upload.wikimedia.org`. That is permitted and
  reliable, but you don't control it: before a store launch, mirror the files
  to your own bucket/CDN and update the three URL columns (the app never
  needs a release for that).
- Review the `report.csv` licence column once; the allow-list is
  deliberately strict, but a licence string you don't recognise deserves a
  look at its Commons page.

## India Jigsaw 160 (Wikimedia Commons)

`backend/content-packs/india_jigsaw_160/manifest.csv` lists the 160 subjects
of the Home screen's **Jigsaw pictures** tab in four collections — Heritage
(40), Nature (40), Wildlife (40), Spirituality (40): the Taj Mahal at
sunrise, Pangong Lake, a Bengal tiger in Ranthambore, Ganga Aarti at
Varanasi and so on. They were written as prompts for a consistent travel-
photography look (16:9, natural light, no HDR, respectful depictions);
rather than generating pictures, the pack resolves each subject to a real,
freely licensed photograph of the real place on Commons:

```powershell
cd backend
npm run ingest:wikimedia -- --manifest content-packs/india_jigsaw_160/manifest.csv --dry-run --limit 5
npm run ingest:wikimedia -- --manifest content-packs/india_jigsaw_160/manifest.csv
```

The app shows the four collections as sub-headings under **Jigsaw
pictures** as soon as their categories exist. Queries that find no
suitable photo appear in `report.csv`; for those, or wherever a generated
image is preferred, upload a 16:9 image through the admin console into
the same category — the prompt text in the manifest describes the shot.
