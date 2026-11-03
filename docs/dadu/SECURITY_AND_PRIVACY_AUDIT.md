# DADU – Security and privacy audit

Scope: the DADU additions in this pass (mobile `src/dadu`, API `backend/src/dadu` and routes,
console `admin/src/app/(console)/dadu`) on top of the Tame foundation whose model is described in
`docs/ARCHITECTURE.md` (scrypt passwords, hashed opaque tokens, RBAC, helmet, rate limits, audit log).
Method: code review of every sensitive flow plus the automated tests named per row. This is an
engineering audit, not legal advice: the DPDP items must be reviewed by qualified counsel before
launch (see `RELEASE_READINESS.md`).

## 1. Threat model (child product)

| Asset | Threat | Control | Status |
|---|---|---|---|
| Child's learning progress and world state | Read by another account | `requireChild` middleware resolves `children/:id` only within `req.user.id` and `deletedAt IS NULL`; tested (`dadu.test.ts` "user B cannot read user A's child") | Verified |
| Child identity | Over-collection | Profiles hold first name, age **band**, difficulty, language and an avatar; no date of birth, no photo of the child, no location, no school. Server schema has no such columns. | Verified by schema |
| Photos in real-world adventures | Uploaded without consent / child's face | Photos are optional, local-only in this build (`photoId` is a device URI; no upload path exists). Server refuses `photoAssetId` without a child-scoped `photos` consent (403 `photo_consent_required`, tested). Copy in the app tells parents never to include faces. | Verified |
| Parent-only functions | Child reaches them | Parental gate (worded product + 4-digit PIN hashed with SHA-256 on device, 5-try lockout) guards Parent Dashboard, Settings and the legacy Tame app; account operations also require the account token. The gate is client-side; every server write still needs the sign-in token. | Implemented; e2e on device pending |
| Account deletion | Residual child data | `DELETE /v1/dadu/me/data` deletes children (cascade to world, progress, mastery, completions, screen time, consents) and returns counts (tested). Child removal is soft (30-day undo) then purged by the cleanup job. Device wipe clears every `dadu.*` AsyncStorage key. | Verified (server), implemented (device) |
| Consent | Processing without consent | Creating a child requires an active `processing` consent (403 `consent_required`, tested); consent rows carry version and withdrawal timestamps; the app records consent before the first profile. | Verified |
| Content integrity | Unreviewed or AI-drafted content published | Eight-step workflow enforced server-side in order with per-step permissions; publish only from `approved`; rights `pending` cannot be published; every admin write audited (12 audit calls in the DADU admin router); versions immutable with rollback (tested in `daduAdmin.test.ts`). | Verified |
| Chat / social exposure | Strangers reach children | DADU has no chat, no messaging, no public profiles, no friend features. The Tame social features remain only behind the parental gate and the legacy switch (off by default). | Verified by design; see open item 4.3 |
| Advertising / purchases | Targeting or unauthorised purchases | No ad SDK, no store billing in DADU; `MONETIZATION_ENABLED=false`. Decoration purchases use in-app coins only. | Verified |
| External links | Child leaves the app | DADU screens contain no outbound links; store/legal links exist only in the legacy Tame settings behind the gate. | Verified |
| Abuse of the API | Flooding progress/world endpoints | Existing general rate limit applies to `/v1/*`; body limit 100 KB; world state validated by zod (`contracts.ts`), progress payload `.strict()`; progress idempotent by `clientId` (tested). | Verified |
| Admin console | Token theft | Unchanged: httpOnly SameSite=Strict cookie, same-origin proxy, `no-store`. New pages gate UI by `useCan`, API re-checks permissions (tested: editor cannot approve, reviewer cannot publish). | Verified |
| Logging | Child data in logs | Request logger records method/route/status/time only (unchanged). DADU routes never log bodies. | Verified by review |
| Secrets | In the mobile bundle | Only `EXPO_PUBLIC_*` values; no keys added. | Verified |
| Dependencies | Vulnerable packages | Added: `expo-speech`, `@expo-google-fonts/*`, `tsx`, `@types/node` (dev). `npm audit` not run in this environment (registry audit endpoint blocked by the proxy); run in CI before release. | Open |

## 2. Data inventory (what DADU stores and where)

| Data | Device (AsyncStorage) | Server (PostgreSQL) | Retention |
|---|---|---|---|
| Language preferences | `dadu.prefs.v1` | with the child profile | until deleted |
| Parent settings (PIN hash, consent timestamp, limits, photo flags) | `dadu.parent.v1` | consents + `dadu_screen_rules` | until deleted |
| Child profiles | `dadu.profiles.v1` | `dadu_child_profiles` (soft delete 30 d) | until deleted |
| World state (plants, animals, objects, rewards, mastery, progress ids) | `dadu.world.v1.<child>` | `dadu_world_states` (jsonb, versioned) | until deleted |
| Progress events | derived on sync | `dadu_progress_events` | until deleted |
| Screen-time minutes per day | `dadu.usage.v1.<child>` | `dadu_screen_time` | until deleted |
| Drawings (gallery) | `dadu.gallery.v1.<child>` (max 20) | never | until deleted |
| Assignment photo (optional) | device URI only | id only, with consent | until deleted |
| Audio settings | `dadu.audio.v1` | never | — |
| Analytics | off by default for DADU profiles; Tame's anonymous events stay opt-in in Settings | `events` (existing) | 395 days (existing cleanup) |

## 3. DPDP (Digital Personal Data Protection Act, 2023) checklist

| Requirement | Implementation | Open |
|---|---|---|
| Verifiable parental consent before processing a child's data | Consent switch + parent PIN at setup; server `consent_required` gate; version recorded | Verification strength (OTP/identity) to be decided with counsel |
| Purpose limitation and minimisation | Only learning-progress data; no DOB, no contact data for the child | — |
| No tracking or behavioural monitoring of children | No ad SDK; analytics off by default; no behavioural profiling beyond mastery for learning | Confirm wording in the privacy policy |
| Right to erasure | Device wipe, child delete, `DELETE /me/data`, cleanup purge | — |
| Data export | Parent dashboard "Export data" shares a JSON of the child's profile, world and usage | Server-side export endpoint not built |
| Notice | Consent text in the app; privacy policy must be updated for DADU | Policy text not yet written |
| Breach handling, DPO, grievance | Organisational; out of code scope | Open |

## 4. Open findings

1. **Parental gate is client-side only.** Acceptable for a single-device product, but a server
   "gate token" (as in `18-api.md`) would let the API refuse parent-only writes made with a stolen
   app token. Priority P1 before accounts are widely used.
2. **No object storage for photos.** Keeping photos device-only is the safest option today; if
   uploads are added, use signed URLs, private buckets, no EXIF, and deletion with the child.
3. **Legacy Tame social features** (friends, group focus, reports) are still compiled into the
   app behind the parental gate and an off-by-default switch. Before the store submission, decide
   whether to strip them from the DADU build (recommended) or keep them adult-only.
4. **`npm audit` and a dependency review** must run in CI before release.
5. **PIN strength**: 4 digits with lockout after 5 failures is fine against a child; it is not an
   account credential and never leaves the device.
6. **Privacy policy, terms and the Play Data safety form** need DADU-specific text (see
   `RELEASE_READINESS.md`).
