# Legal, Copyright & Privacy Considerations

This system publishes AI-assisted news summaries about real people involved
in family disputes and, in some cases, crime. That combination carries real
legal and ethical risk. This document is operational guidance the codebase
enforces where possible — it is not a substitute for review by a lawyer
qualified in Indian media/defamation/privacy law before public launch.

## Copyright

- The pipeline never stores or republishes full article bodies. `RawArticle`
  stores headline, URL, source, publish date, and only the factual extract
  needed for script grounding — never the full copyrighted text.
- Original newspaper photographs are never used in videos. All visuals are
  original illustrations/icons/silhouettes generated for this product
  (§14/§40).
- Every published video and story page shows "Source: <organization>" and a
  "Read original report" link back to the source, and states plainly that
  the video is "an AI-generated summary based on reports from <source>."
- Each `NewsSourceProvider` implementation carries a `licenseNotes` field
  recording the terms under which that source's content may be used;
  providers must not be enabled in production until that review is done.
- RSS ingestion respects each feed's stated terms (no bypassing paywalls,
  no scraping against robots.txt/ToS).

## Defamation & accuracy

- The `JournalisticSafetyService` enforces allegation-vs-fact language
  programmatically (§10): it scans generated scripts for unhedged claims of
  guilt/wrongdoing not attributed to police/FIR/court/witness, and blocks
  the story from advancing past `SAFETY_CHECKED` until fixed.
- No motives, dialogue, quotes, or police/court statements may be invented;
  the script generator is grounded strictly in extracted source facts and
  is instructed (and linted) never to add anything the sources don't
  support.
- Legal status (accused/undertrial/convicted/acquitted) must be kept
  current; `MasterStory.legalStatus` is a distinct, editable field so admins
  can correct it as a case progresses, and stale stories can be flagged for
  a status recheck.
- Admin review (`PENDING_REVIEW`) is the default gate before publication;
  automatic publication should only be enabled per-category after the
  editorial team is confident in the safety linter's precision for that
  category.

## Privacy of private individuals

- Exact home addresses, phone numbers, Aadhaar numbers, and financial
  account numbers are stripped by the moderation pass even if present in
  source text.
- Minors: no photographs/illustrations that could identify a specific real
  minor, no names of minors, and no identifying school/address details
  (§11) — enforced as a hard rule in the moderation module, not just a
  guideline, with a lower auto-publish tolerance.
- Sensitive categories (sexual offences, suicide, domestic violence,
  graphic violence) get additional moderation gates. Suicide-related
  stories in particular must omit method detail and can carry a helpline
  reference, consistent with standard responsible-reporting guidance.
- User accounts (Android app) collect minimal PII — no GPS/location
  permission is ever requested (§20); location filtering is entirely
  user-selected (India → State → District → City).
- Analytics avoid collecting anything beyond what's needed for the metrics
  in §33 (no unnecessary personal data).

## Content moderation & human oversight

- Every generated story passes an automated moderation check (§38) for
  fabricated facts, unsupported claims, defamatory language, excessive
  graphic description, unnecessary PII, minors, sexual content, hate
  speech, sensationalism, and translation/hallucination errors. Anything
  uncertain is flagged for human review rather than silently passed.
- All admin actions are recorded in `AdminAuditLog` for accountability and
  post-hoc review.

## Recommended pre-launch legal review checklist

1. Confirm licensing terms for every News API/RSS source actually enabled.
2. Have a media-law review of the allegation/fact language rules and the
   safety linter's rule set against current Indian defamation and
   contempt-of-court norms.
3. Confirm the privacy policy and in-app disclosures match what the app
   actually collects (device ID, preferences, engagement events).
4. Confirm a takedown/correction process exists for subjects of a story who
   dispute facts (a `Report` flow already exists client-side; back it with
   an editorial SLA).
5. Confirm advertising content (§32) is clearly labelled and cannot
   influence editorial scripts, per §32's requirement.
