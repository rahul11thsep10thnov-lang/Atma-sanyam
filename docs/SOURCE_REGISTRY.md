# Source registry and licence-compliant fact pipeline

The "Did You Know?" engine only reuses text from sources whose licence has been checked.
The registry fills the **same source list the console's "Add a source" form manages**
(`fact_sources`), verifies each source from its licence evidence, keeps verifying it, and
lets approved sources feed facts, with nobody typing a source in by hand.

## Workflow

```
registry (code) ──seed──▶ fact_sources (pending_review)
        │                         │
        │                  verify: fetch the licence-evidence page,
        │                  look for the expected wording
        │                         ▼
        │     approved ◀── wording found, auto-approval allowed ──▶ restricted (non-commercial term found)
        │         │         pending_review (wording missing, or mixed licences: a person decides)
        ▼         ▼         verification_failed / unavailable (endpoint trouble)
 discovery   ingest (approved + licence verified + not suspended only)
 (feeds)     fetch → extract → claim check → age review → duplicate check → language → store
                                  ▼
              facts: 'verified' (or 'published' if FACT_INGEST_AUTO_PUBLISH=true)
                                  ▼
              app reads the DATABASE only (never a live API)
```

## The same fields as "Add a source"

| Form field | Column | Filled automatically with |
|---|---|---|
| Publisher | `publisher` | organisation that publishes the resource |
| Title | `title` | name of the API, dataset or collection |
| URL (https) | `url` (+ `canonical_url`, the duplicate guard) | canonical https URL |
| Accessed on | `accessed_on` | the day the evidence page was **actually fetched** (empty until then) |
| Notes | `notes` | subjects, endpoint, expected licence (labelled a claim), attribution, permitted uses, rate limits, languages, caveat, plus a machine-managed `[Validation]` line |

Licence columns: `licence_name`, `licence_url`, `licence_verified`, `commercial_use_allowed`,
`redistribution_allowed`, `attribution_required`, `share_alike_required`, `api_key_required`,
`rate_limit_notes`, `content_types_allowed`, `last_verified_at`, `verification_status`,
`verification_evidence_url`. Bookkeeping: `source_key`, `origin` (`registry` · `admin` ·
`editorial` · `discovered`), `last_checked_at`, `last_check_error`, `consecutive_failures`,
`evidence_hash`, `evidence_changed_at`, `ingestion_suspended`, `suspension_reason`,
`admin_edited`, `status_locked`, `connector`, `attribution_template`. History:
`source_verification_events` (append-only; nothing is ever deleted).

## What "approved" means

`approved` is set only when **every** wording marker in the registry entry is found on the
publisher's licence/terms page (`evidenceUrl`) and no restrictive marker is. Reaching a
homepage proves nothing. The result is also `pending_review` when the licence wording is
present but the source is **mixed-licence** (`autoApprove: false`: Our World in Data,
GBIF, UNESCO, FAO, POWO, India government sites…), because a person must decide per
dataset. A restrictive marker (for example `NonCommercial` on WHO or FAO terms) gives
`restricted`. Documentation pages and per-item-licence services (Wikimedia Commons,
iNaturalist) are `restricted` by policy: they are never fact-text sources.

Status values: `pending_review` · `approved` · `restricted` · `unavailable` ·
`verification_failed`. An administrator's decision (console, `content:publish`) sets
`status_locked`; the automation then only records its checks and never overrides it.

## The 33 registered sources

| # | Source | Kind | Expected licence (claim) | Evidence the verifier needs | Auto-approvable |
|---|---|---|---|---|---|
| 1 | Wikidata | content | CC0 | "CC0" on Wikidata:Licensing | yes |
| 2 | Wikidata Query Service | content | CC0 (same data) | same | yes |
| 3 | Wikidata data access docs | documentation | n/a | — | policy: restricted |
| 4 | Wikipedia API | content (connector) | CC BY-SA 4.0 | "Creative Commons Attribution-ShareAlike" in the Wikimedia Terms of Use | yes |
| 5 | MediaWiki REST API docs | documentation | n/a | — | policy: restricted |
| 6 | Wikimedia Commons | media | per-file | — | policy: restricted |
| 7 | Commons API docs | documentation | n/a | — | policy: restricted |
| 8 | OpenStreetMap Wiki | content | CC BY-SA (wiki text) | "Creative Commons" and "ShareAlike" on the wiki content-licence page | yes |
| 9–12 | NASA APIs · NASA Science · NASA Space Place · NASA Image and Video Library | content | NASA content generally not subject to copyright (US) | "not subject to copyright" on NASA's media-usage page | yes (image library: caption text only) |
| 13 | ESA | content | CC BY-SA 3.0 IGO where stated | "CC BY-SA 3.0 IGO" on ESA's terms | yes |
| 14–15 | iNaturalist API · iNaturalist | media | per-observation | — | policy: restricted |
| 16 | Plants of the World Online | content | to be confirmed | "Creative Commons" (restrict on "NonCommercial") | no: a person decides |
| 17 | GBIF | content | per dataset | "CC0", "CC BY" | no: a person decides |
| 18 | GBIF API docs | documentation | n/a | — | policy: restricted |
| 19 | NOAA Ocean Service | content | US government, public information | "public information and may be distributed or copied" | yes |
| 20 | USGS | content | public domain unless noted | "public domain" | yes |
| 21 | Our World in Data | content | CC BY 4.0, third-party data varies | "CC BY" | no: a person decides |
| 22 | OWID data-access page | documentation | n/a | — | policy: restricted |
| 23 | World Bank Open Data | content | CC BY 4.0 | "CC BY 4.0" on the datasets terms | yes |
| 24 | World Bank API docs | documentation | n/a | — | policy: restricted |
| 25 | WHO | content | CC BY-NC-SA 3.0 IGO | restrict on "NonCommercial" | no (restricted if found) |
| 26 | United Nations | content | restrictive terms | — | no: a person decides |
| 27 | UNESCO | content | CC BY-SA 3.0 IGO where owned | "CC BY-SA 3.0 IGO" | no: a person decides |
| 28 | ISRO | content | to be confirmed | — | no: a person decides |
| 29 | NCERT | content | read-free, not reproducible | restrict on "written/prior permission" | no |
| 30 | National Portal of India | content | website policy (to be confirmed) | "reproduced" | no: a person decides |
| 31 | Know India | content | portal policy (to be confirmed) | "reproduced" | no: a person decides |
| 32 | Reserve Bank of India | content | to be confirmed | — | no: a person decides |
| 33 | FAO | content | mixed (NC-SA and CC BY) | restrict on "NonCommercial" | no: a person decides |

The registry lives in `backend/src/catalogue/sourceRegistry.ts`. These are candidates: the
licence column is the **expected claim**, stored as unverified until the evidence is found.

## Seeding, idempotence and admin protection

`seedSourceRegistry` runs on API start, in `npm run seed:catalogue`, in tests and at the start
of every maintenance run. It looks a source up by `source_key` **or** canonical URL, inserts
only what is missing (`ON CONFLICT DO NOTHING`), and:

- never changes a record an administrator edited (`admin_edited`), nor a verified licence;
- adopts an existing record with the same URL (attaches the key, fills only **empty**
  claim columns, never wording);
- only ever rewrites the single machine-managed `[Validation]` line of the notes;
- backfills `canonical_url` for older rows and reclassifies the old untouched
  "Starter library source" rows as `editorial` references with no access date.

The console's form rejects a URL that is already registered under any spelling (409), and
editing a source's wording marks it `admin_edited`.

## Maintenance (scheduler)

- In-process: the API runs one cycle 20 s after start and then hourly
  (`startSourceMaintenance`). A cycle only fetches sources whose last check is older than
  `SOURCE_CHECK_INTERVAL_HOURS` (24), at most `SOURCE_MAX_CHECKS_PER_RUN` per run, spaced
  `SOURCE_MIN_REQUEST_INTERVAL_MS` apart per host.
- Cron / serverless hosts: `npm run sources:maintain` (`node dist/database/maintainSources.js`),
  scheduled daily by the `loji-sources` job in `render.yaml`. Both are idempotent and safe together.
- A cycle = seed → verify due sources → discover → ingest.
- Change detection: if a previously approved source's licence wording disappears, or a
  restrictive term appears, or its evidence page is gone, **new ingestion is suspended**
  (`ingestion_suspended`), the source is flagged in the console, stored facts and history are
  kept, and a restrictive finding hides that source's ingested facts from children. If the
  wording returns, ingestion resumes by itself (unless an administrator suspended it).
- Failures: timeouts, 5xx, 429 and network errors are retried with back-off; an approved
  source stays approved through transient failures and becomes `unavailable` after 5 in a
  row (its cached facts keep being shown); a never-verified source becomes
  `verification_failed`; a 404/410 evidence page becomes `unavailable`.

## Discovery

`SOURCE_DISCOVERY_FEEDS` lists JSON feeds (an array of `{publisher, title, url, notes?}`);
`SOURCE_DISCOVERY_ALLOWED_DOMAINS` restricts which hosts may be registered or fetched.
Candidates are https only, deduplicated by canonical URL, capped per run, registered as
`origin = discovered`, `pending_review`, and shown as "newly discovered" in the console.
They are never approved automatically. With no feeds configured (the default) discovery
finds nothing.

## Fetching safely (`src/lib/safeFetch.ts`)

https only; no credentials or non-standard ports; no IP-literal, `localhost`, `.local` or
`.internal` hosts; the host must be on the allow-list (registry hosts plus configured
domains); the address must resolve to public space (private, loopback, link-local and
reserved ranges are refused); redirects are followed by hand (max 3) and every hop is
re-checked; `robots.txt` is honoured (unreadable robots = do not fetch); a descriptive
User-Agent is sent; timeouts, a 2 MB cap and bounded retries apply. Fetching and any
credentials are server-side only: nothing in `src/` (the app) calls a source.

## Fact ingestion (`src/services/factIngestService.ts`)

Gate: `canIngestFrom` = approved + `licence_verified` + not suspended + `text` in
`content_types_allowed`. Then, per article: fetch the short summary; clean it
(parentheticals and footnotes out); **claim check** (every word of the child text must occur,
in order, in the source passage, so nothing is added); unsuitable-content filter (English and
Hindi blocklists); reading-difficulty age review (A–D, minimum/maximum age); exact and
near-duplicate detection; Hindi from the Hindi Wikipedia summary of the same topic when one
exists; store with `source_id`, `source_url`, `supporting_reference` (the source passage),
`licence_name`, `attribution_text`, `claim_check = source_supported`, `reviewed_at`,
`content_hash`. Status is `verified`; `FACT_INGEST_AUTO_PUBLISH=true` publishes them, otherwise
an editor publishes in the console (which refuses an ingested fact whose source is not
currently approved). Delivery (`listFactsForChild`) serves from the database only and hides
ingested facts whose source licence is unverified or restricted.

Field mapping to the requested fact record: `fact_id`=`id`/`slug`, `fact_text`=`body`
(+`headline`), `topic`=`category` (15 topics in `FACT_TOPICS` map onto the categories),
`minimum_age`/`maximum_age`, `language` (+`translations`), `source_id`, `source_url`,
`supporting_reference`, `licence_name`, `attribution_text`, `fact_verification_status`=`status`
+ `claim_check`, `reviewed_at`, `created_at`, `updated_at`.

## Console

Fact sources page: registered/approved/awaiting-review/restricted counts, last verification,
errors, facts per source, per-source history, **Verify now** (`content:verify`), **Run
maintenance now** and licence decisions (`content:publish`), and the unchanged "Add a source"
form. The dashboard shows approved sources and errors.

## Environment

No third-party API key is needed today. Optional/recommended: `SOURCE_BOT_CONTACT`. Tuning:
`SOURCE_MAINTENANCE_ENABLED`, `SOURCE_CHECK_INTERVAL_HOURS`, `SOURCE_FETCH_TIMEOUT_MS`,
`SOURCE_FETCH_RETRIES`, `SOURCE_MIN_REQUEST_INTERVAL_MS`, `SOURCE_MAX_CHECKS_PER_RUN`,
`SOURCE_DISCOVERY_*`, `FACT_INGEST_*`. Outbound HTTPS to the publishers must be permitted by
the host's network policy.
