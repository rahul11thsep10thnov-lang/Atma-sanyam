# DADU – Database migration log

## 0006_dadu (`backend/drizzle/0006_dadu.sql`)

Generated with `npx drizzle-kit generate --name dadu` from `backend/src/database/schema.ts` on 2026-11-02;
journal entry `idx 6`, snapshot `drizzle/meta/0006_snapshot.json`. Fifteen new tables, 32 indexes and
constraints, no change to any existing table. Applied by the existing runner (`npm run db:migrate`,
`runMigrations` in `src/database/migrate.ts`), which also syncs the new permissions and the `reviewer` role.

| Table | Purpose | Keys and cascades |
|---|---|---|
| `dadu_child_profiles` | Child profiles owned by a parent account | `user_id → users (cascade)`; `deleted_at` for the 30-day undo window; checks on band, difficulty, name length |
| `dadu_consents` | DPDP consents: `processing`, `photos`, `analytics`, per account or per child | `user_id → users (cascade)`, `child_id → child (cascade)` |
| `dadu_world_states` | One shared world state JSON per child with an optimistic version | pk `child_id → child (cascade)` |
| `dadu_progress_events` | Append-only progress log; `client_id` unique for idempotent sync | `child_id (cascade)`; index `(child_id, id)` for cursor paging |
| `dadu_mastery` | Per-concept mastery, attempts, interval and due date | pk `(child_id, concept)`; index `(child_id, next_review_at)` |
| `dadu_assignment_completions` | Real-world assignment completions, optional note and photo asset id | unique `(child_id, assignment_id)`; `consent_id → consents (set null)` |
| `dadu_screen_time` | Minutes per child per day | pk `(child_id, day)` |
| `dadu_screen_rules` | Daily limit, bedtime, break interval | pk `child_id (cascade)` |
| `dadu_content_items` | Content catalogue: id, kind, section, bands, languages, rights, workflow status, current and published version | checks on id pattern and difficulty; indexes on `(kind, status, updated_at)` and `(section, kind)` |
| `dadu_content_versions` | Immutable version bodies | unique `(item_id, version)`; `item_id (cascade)` |
| `dadu_review_steps` | Every workflow decision with reviewer and note | index `(item_id, version, id)` |
| `dadu_media_assets` | Asset registry with mandatory licence, source, creator; `sha256` unique for duplicate detection | indexes on kind, character, location |
| `dadu_packs` | Offline pack manifests | unique `(kind, language, version)` |
| `dadu_feature_flags` | JSON flags served in the manifest | pk `key` |
| `dadu_sync_cursors` | Reserved for per-child delta cursors | pk `child_id (cascade)` |

### How it was applied and verified

1. Test suite: `tests/helpers.ts` drops and recreates the schema and runs every migration before each test
   file; the full suite (157 tests, 10 files) passes against PostgreSQL 16.15.
2. Fresh database: `createdb focus_migrate && DATABASE_URL=… npm run db:migrate` applied 0000–0006 and
   synced RBAC; `psql` then reported 15 `dadu_%` tables, 32 `dadu_%` indexes and four roles
   (`admin`, `editor`, `reviewer`, `super_admin`).
3. Seed: `npm run seed:dadu` inserted 63 published items (7 characters, 38 locations, 9 lessons, 9
   assignments); a second run updated them in place (idempotent, versions stay at 1).
4. Production build: `npm run build` emits `dist/database/seedDadu.js` and the new routes.

### Rollback

The migration is purely additive. To roll back, drop the fifteen tables in reverse dependency order
(`dadu_sync_cursors`, `dadu_feature_flags`, `dadu_packs`, `dadu_media_assets`, `dadu_review_steps`,
`dadu_content_versions`, `dadu_content_items`, `dadu_screen_rules`, `dadu_screen_time`,
`dadu_assignment_completions`, `dadu_mastery`, `dadu_progress_events`, `dadu_world_states`,
`dadu_consents`, `dadu_child_profiles`), delete the `0006_dadu` row from `drizzle.__drizzle_migrations`,
and remove the DADU permissions and the `reviewer` role from `rbac.ts` (the next migrate re-syncs RBAC
and deletes permissions no longer in code). No existing table or row is touched either way.

### Retention and deletion

- Child soft delete → purge after 30 days by `npm run cleanup` (added to `src/database/cleanup.ts`);
  the purge cascades to every child-scoped table.
- `DELETE /v1/dadu/me/data` deletes consents and children immediately (cascade).
- Deleting the parent account (`DELETE /v1/me`) cascades through `user_id`.
- Progress events are kept with the child; no separate retention window yet.

### Divergences from `17-database-schema.md`

- Localised text is embedded in version bodies (`{ en, hi, … }`) instead of a generic
  `dadu_translations` table, so the published body is exactly what the app renders and packs can hash it.
- Curriculum tree tables are not created; `section`, `subject`, `topic` live on `dadu_content_items`.
- Wallet, badges, inventory, decorations and plant state are fields of `dadu_world_states.state`
  (client-authoritative, merged with explicit rules) rather than separate tables.
- The parental-gate token, photo storage and certificates tables are deferred (see
  `API_COMPLETION_MATRIX.md`).
