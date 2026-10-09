# Source registry and automated discovery

How Naukri Chayan finds government job notices, what was added in the
source-registry expansion, and — honestly — what has and has not been
verified.

## Verification status (read first)

**No source in this registry has been verified yet.** The URLs were
written from public knowledge of each organization's official domain, and
the build environment that wrote them cannot reach any government website
(its network proxy refuses them; `npm run sources:verify` there fails with
`ENOTFOUND` for every site). So every registry row was saved:

- **disabled** (`active = false`),
- **awaiting approval** (`approvalStatus = PENDING`),
- **unverified** (`verificationStatus = UNVERIFIED`), with a note saying so.

Nothing is fetched until an admin approves and enables a source. To verify
them, run on a machine that can reach the sites (your PC or the server):

```bash
npm run sources:verify -- --pending      # or --state UP, --category RAILWAY, --id <id>, --limit 20
```

It checks, for each source: the URL passes the safety checks, robots.txt
allows it, it answers with HTTP 2xx, the **final URL is on the configured
official domain** (a redirect to a different or look-alike domain fails
verification instead of being accepted), and at least one notice link is
parsed. It writes `source-verification-report.md` and marks each source
VERIFIED or FAILED (with the reason). It never approves or enables anything.

### The Sarkari Result aggregator

`https://www.sarkariresult.com.cm/` and `/latest-jobs/` are seeded exactly
as given — **no other domain was substituted**. Note that `.com.cm` is
Cameroon's country-code domain and is not the long-established
`sarkariresult.com`; please confirm which site you intend. It could not be
reached from the build environment, so its ownership, content and terms of
use are unverified. It therefore stays **disabled with a diagnostic note**.
To enable it: Verify it, read its published terms of use, tick “I read the
site’s terms…” on its page and Verify again, approve, then enable. Even
then it is a *discovery* source only: its notices always go to human
review, the page's official (gov.in/nic.in/…) links are extracted so the
recruiting organization's own notice URL is kept, and the aggregator page is
stored separately as `discoveredViaUrl`. Category pages beyond `/` and
`/latest-jobs/` are not guessed — once it is verified and approved,
**Discover sources** proposes them from its own navigation.

## What a source is

Each source (Admin → Automation → Sources) has: name, organization,
category (A–G or aggregator), state/UT, group, URL (unique by canonical
form — `http`/`https`, `www.`, tracking parameters and a trailing slash do
not make a second source), type (HTML, RSS, Atom, JSON/API, sitemap, PDF),
enabled, priority, check interval, request timeout, rate limit (minimum gap
between requests to that site), parser configuration, pagination
configuration, approval and verification status, and the live counters:
last attempt, last successful fetch, last successful extraction, last HTTP
status and duration, consecutive failures, latest error, documents found,
new notices added, last verification time.

Actions: Add, Edit, Test (dry run), Verify, Run now, Approve/Reject,
Enable/Disable, Discover sources, Delete; bulk Approve / Reject / Enable /
Disable / Test / Run now (network actions capped at 25 sources, three at a
time, one connection per site).

## Health

Health is calculated, not stored:

| Health | Meaning |
|---|---|
| healthy | Latest check fetched **and** extracted notice links |
| attention | Page downloaded (e.g. HTTP 200) but nothing was parsed — layout changed, JavaScript-only page, or parser config needed. **An HTTP 200 alone is never “healthy”.** |
| failing | Network error, 404, 5xx, robots.txt refusal or unsafe URL |
| blocked | The site refused us (401/403/451) or asked us to wait (429/503 with a long Retry-After); paused until the shown time |
| stale | No good extraction within three check intervals |
| never / disabled / pending | Not checked yet / switched off / awaiting approval |

## Scheduling and reliability

- Default intervals: HIGH 30 min, NORMAL 4 h, LOW 24 h (per source, and
  `PIPELINE_FREQ_*`). Each check sets `nextCheckAt`.
- Failures back off exponentially (interval × 2ⁿ, 15 min – 24 h) with ±10 %
  jitter. Inside one fetch, transient errors (network, 408, 429, 5xx) are
  retried twice with jittered exponential backoff.
- `Retry-After` is honoured: short waits inline, long ones pause the source.
- **HTTP 401/403/451 are never retried and never worked around** (no
  browser impersonation, no certificate bypass). The source is paused for a
  day (then 2, 4 … up to 7 days) and an alert is raised.
- One pass at a time (run lock, stale runs closed after 30 min) and one
  check per source at a time (per-source lock with expiry, so a crashed
  process doesn't wedge a source). Re-running is idempotent: same URL = same
  document, same bytes = no new version, one notice per document.
- Alerts: after 3 failed checks in a row, or any block, an `ALERT:` entry
  appears in Automation → Failed items and in the worker log.
- Diagnostics per check are capped at ~4 KB and deleted after
  `SOURCE_CHECK_RETENTION_DAYS` (30). URLs in logs have credentials and
  secret-looking parameters redacted.

## Safety (SSRF and access rules)

- Only `http`/`https`, ports 80/443/8080/8443, no credentials in URLs.
- Loopback, private, link-local (cloud metadata), CGNAT, multicast,
  reserved and IPv4-mapped/NAT64 forms of those are refused — both as
  literal addresses and **after DNS resolution at connection time** (so a
  domain that resolves to an internal address is refused too).
- Redirects are followed by hand; every hop is validated before anything is
  sent to it. A listing may only redirect within its own site or to another
  official government host; aggregators must stay on their own site.
- robots.txt is read through the same guard; 5xx on robots.txt means
  “disallowed for now” (RFC 9309), `Crawl-delay` raises the rate limit.

## Parsing

- HTML: generic scan (PDF links + recruitment keywords) or a per-site
  `parserConfig`, e.g.
  `{"itemSelector":"table.notices tbody tr","titleSelector":"td:nth-child(2)","dateSelector":"td:first-child","excludeUrlPattern":"/tender/"}`.
- Pagination: `{"type":"nextLink","maxPages":3}` (rel=next / “Next” /
  “View More”) or `{"type":"pattern","urlTemplate":"https://…?page={page}"}`;
  same site only, at most 10 pages, stops when a page adds nothing new.
- RSS and Atom feeds, sitemaps, single PDFs, and JSON APIs with
  `{"itemsPath":"data.notices","urlField":"link","titleField":"heading","dateField":"date"}`.
- JavaScript-rendered pages are **not** rendered with a browser; they show
  up as *attention* (“no notice links found”) so an admin can switch to the
  site's RSS feed, API or a server-rendered page instead.

## Sections and lifecycle

Every notice gets a `sections` list (one notice, many sections, no copies):
Latest Jobs, Results, Admit Cards, Answer Keys, Application Status, Exam
Dates, Exam Calendar, Syllabus, Admissions, Scholarships, Correction
Windows, Merit Lists, Cut-off Marks, Interview Notices, Counselling, Other
Notices. Scholarships and admissions are kept out of Latest Jobs. Notices
also get a `stateCode` when the organization/title names exactly one state
(abbreviations such as UPSSSC, BPSC, RSSB, UKSSSC, CGPSC included).

Lifecycle types now include *Application started* and *Correction window*
alongside new notification, last date extended, admit card, exam date
(announced/changed), answer key, result, merit/selection list; each is
linked to the same recruitment and shown in its timeline.

## Discovery

**Discover sources** (or `npm run sources:discover -- --verified`) reads one
approved root source's page plus the feeds and sitemaps it advertises and
proposes: recruitment/result/admit-card/… sections on the same site, RSS/Atom
feeds, sitemaps, and other *official* authorities (gov.in, nic.in, ac.in,
edu.in, res.in, or `SOURCE_DISCOVERY_ALLOWED_DOMAINS`) linked under an
authority-like name — proposed at their home page only. Non-official
external links, PDFs, unsafe URLs and existing sources are skipped. It never
recurses: sources that were themselves discovered cannot start discovery.
Everything is saved **pending approval and disabled**, unless
`SOURCE_DISCOVERY_TRUST_SAME_SITE=true` and the parent is verified (then
same-site sections only are approved and enabled).

## Coverage

All 28 states and 8 UTs are supported (state/UT field, filters, detection).
The registry seeds sources for 30 of the 36; no source is seeded yet for
**Andaman and Nicobar Islands, Chandigarh (apart from the Punjab & Haryana
High Court, filed under Haryana), Dadra and Nagar Haveli and Daman and Diu,
Ladakh, Lakshadweep and Puducherry** — their official recruitment pages
were not known with enough confidence to write down. Add them with
**Add source** once you have the URL.

Not seeded on purpose: exams whose website moves every year (GATE, IIT JAM,
JEE Advanced, state TETs), regional rural banks individually (they recruit
through IBPS RRB), and every individual central ministry, university and
hospital — add those as needed, or let Discovery propose them from the
seeded authorities.

RRB recruitment types (NTPC, Group D, ALP, Technician, JE, Paramedical,
Ministerial & Isolated) are not separate sites: every RRB publishes the same
CEN notices, so each RRB is its own source and duplicates are merged by the
dedup step.

## Source-by-source report

Domain confidence: **high** = long-standing, widely published official
domain; **medium** = official but has moved before or has www/.nic.in/.gov.in
variants — check the final URL during verification.

### A. Central government (31)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| Staff Selection Commission (SSC) | https://ssc.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Union Public Service Commission (UPSC) | https://upsc.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Observed HTTP 403 for automated requests from the owner's PC; expect BLOCKED — do not work around it. |
| National Testing Agency (NTA) | https://nta.ac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Employment News / Rozgar Samachar | https://employmentnews.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Much content is e-paper/PDF; may need a parser configuration. |
| National Career Service | https://www.ncs.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Department of Personnel & Training (DoPT) | https://dopt.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Food Corporation of India (FCI) | https://fci.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| ONGC | https://ongcindia.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Oil Corporation (IOCL) | https://iocl.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| NTPC | https://www.ntpc.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| BHEL | https://www.bhel.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| SAIL | https://www.sail.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| GAIL | https://gailonline.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Bharat Electronics (BEL) | https://bel-india.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Hindustan Aeronautics (HAL) | https://hal-india.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Coal India | https://www.coalindia.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| POWERGRID | https://www.powergrid.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Airports Authority of India (AAI) | https://www.aai.aero/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| BSNL | https://www.bsnl.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| NHPC | https://www.nhpcindia.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| HPCL | https://www.hindustanpetroleum.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| BPCL | https://www.bharatpetroleum.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| NLC India | https://www.nlcindia.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Oil India | https://www.oil-india.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| DRDO | https://www.drdo.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| ISRO | https://www.isro.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| CSIR | https://www.csir.res.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| ICMR | https://www.icmr.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| BARC | https://www.barc.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| AIIMS New Delhi | https://www.aiims.edu/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| ESIC | https://www.esic.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |

### B. Banking & financial (25)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| IBPS (incl. IBPS RRB for regional rural banks) | https://www.ibps.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Owner's PC: curl HTTP 200 but Node fetch failed; the new error messages will show the real cause. |
| SBI Careers | https://sbi.co.in/web/careers |  | high | Added — disabled, awaiting approval, **not verified** |  |
| RBI Opportunities | https://opportunities.rbi.org.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| NABARD | https://www.nabard.org/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| SIDBI | https://www.sidbi.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| EXIM Bank | https://www.eximbankindia.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| National Housing Bank | https://nhb.org.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| SEBI | https://www.sebi.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| LIC of India | https://licindia.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| GIC Re | https://www.gicre.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| New India Assurance | https://www.newindia.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| United India Insurance | https://uiic.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| National Insurance Company | https://nationalinsurance.nic.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Oriental Insurance | https://orientalinsurance.org.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Bank of Baroda | https://www.bankofbaroda.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Punjab National Bank | https://www.pnbindia.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Canara Bank | https://canarabank.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Union Bank of India | https://www.unionbankofindia.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Bank of India | https://bankofindia.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Bank | https://www.indianbank.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Central Bank of India | https://www.centralbankofindia.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Overseas Bank | https://www.iob.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| UCO Bank | https://www.ucobank.com/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Bank of Maharashtra | https://bankofmaharashtra.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Punjab & Sind Bank | https://punjabandsindbank.co.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |

### C. Railway (28)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| RRB common application portal | https://www.rrbapply.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Railways | https://indianrailways.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| RRB Ahmedabad | https://www.rrbahmedabad.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Ajmer | https://www.rrbajmer.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Prayagraj (Allahabad) | https://www.rrbald.gov.in/ |  | medium | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Bengaluru | https://www.rrbbnc.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Bhopal | https://www.rrbbpl.nic.in/ |  | medium | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Bhubaneswar | https://www.rrbbbs.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Bilaspur | https://www.rrbbilaspur.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Chandigarh | https://www.rrbcdg.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Owner's PC: TLS certificate does not match www.rrbcdg.gov.in (SEC_E_WRONG_PRINCIPAL); try https://rrbcdg.gov.in/ — never disable certificate checks. |
| RRB Chennai | https://www.rrbchennai.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Gorakhpur | https://www.rrbgkp.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Guwahati | https://www.rrbguwahati.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Jammu-Srinagar | https://www.rrbjammu.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Kolkata | https://www.rrbkolkata.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Malda | https://www.rrbmalda.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Mumbai | https://www.rrbmumbai.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Muzaffarpur | https://www.rrbmuzaffarpur.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Patna | https://www.rrbpatna.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Ranchi | https://www.rrbranchi.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Secunderabad | https://www.rrbsecunderabad.gov.in/ |  | medium | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Siliguri | https://www.rrbsiliguri.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRB Thiruvananthapuram | https://www.rrbthiruvananthapuram.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Each RRB publishes its own copy of CEN notices; duplicates across RRBs are merged by the dedup step. |
| RRC Northern Railway | https://www.rrcnr.org/ |  | high | Added — disabled, awaiting approval, **not verified** | Also publishes railway apprentice notices. |
| RRC Central Railway | https://www.rrccr.com/ |  | high | Added — disabled, awaiting approval, **not verified** | Also publishes railway apprentice notices. |
| RRC Western Railway | https://www.rrc-wr.com/ |  | high | Added — disabled, awaiting approval, **not verified** | Also publishes railway apprentice notices. |
| RRC North Central Railway | https://www.rrcpryj.org/ |  | medium | Added — disabled, awaiting approval, **not verified** |  |
| RRC Southern Railway | https://www.rrcmas.in/ |  | medium | Added — disabled, awaiting approval, **not verified** |  |

### D. State / UT (59)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| UPPSC — UP Public Service Commission | https://uppsc.up.nic.in/ | UP | high | Added — disabled, awaiting approval, **not verified** |  |
| UPSSSC — UP Subordinate Services Selection Commission | https://upsssc.gov.in/ | UP | high | Added — disabled, awaiting approval, **not verified** |  |
| UP Police Recruitment & Promotion Board | https://uppbpb.gov.in/ | UP | high | Added — disabled, awaiting approval, **not verified** |  |
| Allahabad High Court | https://www.allahabadhighcourt.in/ | UP | high | Added — disabled, awaiting approval, **not verified** |  |
| UPPCL — UP Power Corporation | https://www.uppcl.org/ | UP | high | Added — disabled, awaiting approval, **not verified** |  |
| UPSRTC — UP State Road Transport | https://www.upsrtc.com/ | UP | high | Added — disabled, awaiting approval, **not verified** |  |
| BPSC — Bihar Public Service Commission | https://bpsc.bihar.gov.in/ | BR | high | Added — disabled, awaiting approval, **not verified** |  |
| BSSC — Bihar Staff Selection Commission | https://bssc.bihar.gov.in/ | BR | high | Added — disabled, awaiting approval, **not verified** |  |
| CSBC — Central Selection Board of Constable, Bihar | https://csbc.bihar.gov.in/ | BR | high | Added — disabled, awaiting approval, **not verified** |  |
| BPSSC — Bihar Police Subordinate Services Commission | https://bpssc.bihar.gov.in/ | BR | high | Added — disabled, awaiting approval, **not verified** |  |
| Patna High Court | https://patnahighcourt.gov.in/ | BR | high | Added — disabled, awaiting approval, **not verified** |  |
| State Health Society Bihar | https://shs.bihar.gov.in/ | BR | medium | Added — disabled, awaiting approval, **not verified** |  |
| MPPSC — MP Public Service Commission | https://mppsc.mp.gov.in/ | MP | high | Added — disabled, awaiting approval, **not verified** |  |
| MPESB — MP Employees Selection Board | https://esb.mp.gov.in/ | MP | high | Added — disabled, awaiting approval, **not verified** |  |
| Madhya Pradesh High Court | https://mphc.gov.in/ | MP | high | Added — disabled, awaiting approval, **not verified** |  |
| RPSC — Rajasthan Public Service Commission | https://rpsc.rajasthan.gov.in/ | RJ | high | Added — disabled, awaiting approval, **not verified** |  |
| RSSB — Rajasthan Staff Selection Board | https://rssb.rajasthan.gov.in/ | RJ | high | Added — disabled, awaiting approval, **not verified** |  |
| Rajasthan High Court | https://hcraj.nic.in/ | RJ | high | Added — disabled, awaiting approval, **not verified** |  |
| Rajasthan Police | https://police.rajasthan.gov.in/ | RJ | high | Added — disabled, awaiting approval, **not verified** |  |
| UKPSC — Uttarakhand Public Service Commission | https://psc.uk.gov.in/ | UT | high | Added — disabled, awaiting approval, **not verified** |  |
| UKSSSC — Uttarakhand Subordinate Service Selection Commission | https://sssc.uk.gov.in/ | UT | high | Added — disabled, awaiting approval, **not verified** |  |
| High Court of Uttarakhand | https://highcourtofuttarakhand.gov.in/ | UT | high | Added — disabled, awaiting approval, **not verified** |  |
| HPSC — Haryana Public Service Commission | https://hpsc.gov.in/ | HR | high | Added — disabled, awaiting approval, **not verified** |  |
| HSSC — Haryana Staff Selection Commission | https://hssc.gov.in/ | HR | high | Added — disabled, awaiting approval, **not verified** |  |
| Punjab & Haryana High Court | https://highcourtchd.gov.in/ | HR | high | Added — disabled, awaiting approval, **not verified** | Serves Punjab, Haryana and Chandigarh. |
| PPSC — Punjab Public Service Commission | https://ppsc.gov.in/ | PB | high | Added — disabled, awaiting approval, **not verified** |  |
| PSSSB — Punjab Subordinate Services Selection Board | https://sssb.punjab.gov.in/ | PB | high | Added — disabled, awaiting approval, **not verified** |  |
| Punjab Police | https://www.punjabpolice.gov.in/ | PB | high | Added — disabled, awaiting approval, **not verified** |  |
| JPSC — Jharkhand Public Service Commission | https://www.jpsc.gov.in/ | JH | high | Added — disabled, awaiting approval, **not verified** |  |
| JSSC — Jharkhand Staff Selection Commission | https://jssc.jharkhand.gov.in/ | JH | medium | Added — disabled, awaiting approval, **not verified** |  |
| Jharkhand High Court | https://jharkhandhighcourt.nic.in/ | JH | high | Added — disabled, awaiting approval, **not verified** |  |
| CGPSC — Chhattisgarh Public Service Commission | https://psc.cg.gov.in/ | CT | high | Added — disabled, awaiting approval, **not verified** |  |
| CG Vyapam — Professional Examination Board | https://vyapam.cgstate.gov.in/ | CT | high | Added — disabled, awaiting approval, **not verified** |  |
| High Court of Chhattisgarh | https://highcourt.cg.gov.in/ | CT | high | Added — disabled, awaiting approval, **not verified** |  |
| DSSSB — Delhi Subordinate Services Selection Board | https://dsssb.delhi.gov.in/ | DL | high | Added — disabled, awaiting approval, **not verified** |  |
| Delhi High Court | https://delhihighcourt.nic.in/ | DL | high | Added — disabled, awaiting approval, **not verified** |  |
| APPSC — Andhra Pradesh PSC | https://psc.ap.gov.in/ | AP | high | Added — disabled, awaiting approval, **not verified** |  |
| APPSC — Arunachal Pradesh PSC | https://appsc.gov.in/ | AR | medium | Added — disabled, awaiting approval, **not verified** |  |
| APSC — Assam PSC | https://apsc.nic.in/ | AS | high | Added — disabled, awaiting approval, **not verified** |  |
| GPSC — Goa PSC | https://gpsc.goa.gov.in/ | GA | high | Added — disabled, awaiting approval, **not verified** |  |
| GPSC — Gujarat PSC | https://gpsc.gujarat.gov.in/ | GJ | high | Added — disabled, awaiting approval, **not verified** |  |
| GSSSB — Gujarat Subordinate Service Selection Board | https://gsssb.gujarat.gov.in/ | GJ | high | Added — disabled, awaiting approval, **not verified** |  |
| HPPSC — Himachal Pradesh PSC | https://www.hppsc.hp.gov.in/ | HP | high | Added — disabled, awaiting approval, **not verified** |  |
| KPSC — Karnataka PSC | https://kpsc.kar.nic.in/ | KA | high | Added — disabled, awaiting approval, **not verified** |  |
| Kerala PSC | https://www.keralapsc.gov.in/ | KL | high | Added — disabled, awaiting approval, **not verified** |  |
| MPSC — Maharashtra PSC | https://mpsc.gov.in/ | MH | high | Added — disabled, awaiting approval, **not verified** |  |
| Manipur PSC | https://mpscmanipur.gov.in/ | MN | medium | Added — disabled, awaiting approval, **not verified** |  |
| Meghalaya PSC | https://mpsc.nic.in/ | ML | medium | Added — disabled, awaiting approval, **not verified** |  |
| Mizoram PSC | https://mpsc.mizoram.gov.in/ | MZ | medium | Added — disabled, awaiting approval, **not verified** |  |
| NPSC — Nagaland PSC | https://npsc.nagaland.gov.in/ | NL | medium | Added — disabled, awaiting approval, **not verified** |  |
| OPSC — Odisha PSC | https://www.opsc.gov.in/ | OR | high | Added — disabled, awaiting approval, **not verified** |  |
| OSSC — Odisha Staff Selection Commission | https://www.ossc.gov.in/ | OR | high | Added — disabled, awaiting approval, **not verified** |  |
| Sikkim PSC | https://spsc.sikkim.gov.in/ | SK | medium | Added — disabled, awaiting approval, **not verified** |  |
| TNPSC — Tamil Nadu PSC | https://www.tnpsc.gov.in/ | TN | high | Added — disabled, awaiting approval, **not verified** |  |
| TGPSC — Telangana PSC | https://www.tspsc.gov.in/ | TG | medium | Added — disabled, awaiting approval, **not verified** | Renamed TSPSC → TGPSC; the domain may redirect — confirm the final URL. |
| TPSC — Tripura PSC | https://tpsc.tripura.gov.in/ | TR | medium | Added — disabled, awaiting approval, **not verified** |  |
| WBPSC — West Bengal PSC | https://psc.wb.gov.in/ | WB | medium | Added — disabled, awaiting approval, **not verified** |  |
| JKPSC — Jammu & Kashmir PSC | https://jkpsc.nic.in/ | JK | high | Added — disabled, awaiting approval, **not verified** |  |
| JKSSB — J&K Services Selection Board | https://jkssb.nic.in/ | JK | high | Added — disabled, awaiting approval, **not verified** |  |

### E. Defence & uniformed (13)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| Indian Army — Join Indian Army | https://joinindianarmy.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Navy — Join Indian Navy | https://www.joinindiannavy.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Air Force — careers | https://careerindianairforce.cdac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Air Force — Agniveer Vayu | https://agnipathvayu.cdac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Indian Coast Guard | https://joinindiancoastguard.cdac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Border Security Force (BSF) recruitment | https://rectt.bsf.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Central Reserve Police Force (CRPF) recruitment | https://rect.crpf.gov.in/ |  | medium | Added — disabled, awaiting approval, **not verified** |  |
| Central Industrial Security Force (CISF) recruitment | https://cisfrectt.cisf.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| ITBP recruitment | https://recruitment.itbpolice.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Sashastra Seema Bal (SSB) recruitment | https://ssbrectt.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Assam Rifles | https://www.assamrifles.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| National Security Guard (NSG) | https://www.nsg.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Recruitment is mostly by deputation; few public notices. |
| Ministry of Home Affairs | https://www.mha.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |

### F. Education & entrance (12)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| UGC NET (NTA) | https://ugcnet.nta.ac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| CSIR NET (NTA) | https://csirnet.nta.ac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| JEE Main (NTA) | https://jeemain.nta.ac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| NEET UG (NTA) | https://neet.nta.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| CUET UG (NTA) | https://cuet.nta.nic.in/ |  | medium | Added — disabled, awaiting approval, **not verified** |  |
| CTET (CBSE) | https://ctet.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| CLAT — Consortium of NLUs | https://consortiumofnlus.ac.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| JoSAA counselling | https://josaa.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| MCC medical counselling | https://mcc.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Kendriya Vidyalaya Sangathan | https://kvsangathan.nic.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Navodaya Vidyalaya Samiti | https://navodaya.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| University Grants Commission | https://www.ugc.gov.in/ |  | medium | Added — disabled, awaiting approval, **not verified** |  |

### G. Other government (6)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| Supreme Court of India | https://www.sci.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| India Post GDS online | https://indiapostgdsonline.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| India Post | https://www.indiapost.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| Apprenticeship India (NAPS) | https://www.apprenticeshipindia.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| NATS — National Apprenticeship Training Scheme | https://nats.education.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** |  |
| National Scholarship Portal | https://scholarships.gov.in/ |  | high | Added — disabled, awaiting approval, **not verified** | Scholarship notices are stored in the Scholarships section, separate from jobs. |

### Public aggregator (2)

| Source | URL seeded | State | Domain confidence | Status | Notes |
|---|---|---|---|---|---|
| Sarkari Result (aggregator) — home | https://www.sarkariresult.com.cm/ |  | medium | Added — disabled, awaiting approval, **not verified** | USER-PROVIDED domain, not verified. '.com.cm' is a Cameroon country-code domain and differs from the long-established sarkariresult.com — confirm which site is intended (no substitution has been made). Before enabling: verify reachability and ownership, read the site's terms of use, and confirm automated access is permitted. Aggregator notices always go to human review and are never treated as the authority for dates, vacancies or eligibility. |
| Sarkari Result (aggregator) — Latest Jobs | https://www.sarkariresult.com.cm/latest-jobs/ |  | medium | Added — disabled, awaiting approval, **not verified** | USER-PROVIDED domain, not verified. '.com.cm' is a Cameroon country-code domain and differs from the long-established sarkariresult.com — confirm which site is intended (no substitution has been made). Before enabling: verify reachability and ownership, read the site's terms of use, and confirm automated access is permitted. Aggregator notices always go to human review and are never treated as the authority for dates, vacancies or eligibility. |

