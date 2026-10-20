// The console's source list ("Add a source" form + the registry's automatic
// records live in the same table). Reading needs content:read; editing the
// wording needs content:write; deciding a licence status needs content:publish;
// "Verify now" needs content:verify.
import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { factSources, sourceVerificationEvents, SOURCE_VERIFICATION_STATUSES } from '../../database/schema.js';
import type { Auth } from '../../middleware/auth.js';
import { parse } from '../../middleware/validate.js';
import { badRequest, conflict, notFound } from '../../lib/httpError.js';
import { audit } from '../../lib/audit.js';
import { canonicalizeUrl } from '../../lib/url.js';
import { runIngestion } from '../../services/factIngestService.js';
import { listSourcesWithStats, recentSourceEvents, runMaintenance, runtimeFromEnv, sourceSummary, verifyNow, withValidation } from '../../services/sourceRegistryService.js';
import type { AppDeps } from '../../types.js';

const idParam = z.string().uuid();
const httpsUrl = z.string().trim().url().max(500).refine((u) => u.startsWith('https://'), 'Use https://');

const sourceFields = z.object({
  title: z.string().trim().min(1).max(200),
  publisher: z.string().trim().min(1).max(120),
  url: httpsUrl,
  accessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

// Licence decisions: a person with content:publish.
const decisionFields = z.object({
  verificationStatus: z.enum(SOURCE_VERIFICATION_STATUSES).optional(),
  licenceName: z.string().trim().min(1).max(200).optional(),
  licenceUrl: httpsUrl.optional(),
  verificationEvidenceUrl: httpsUrl.optional(),
  ingestionSuspended: z.boolean().optional(),
  statusLocked: z.boolean().optional(),
});

export function adminSourcesRouter(deps: AppDeps, auth: Auth) {
  const { db, env } = deps;
  const r = Router();
  const runtime = () => runtimeFromEnv(env, deps.sourceRuntime);

  r.get('/', auth.requirePermission('content:read'), async (req, res) => {
    const q = parse(z.object({ search: z.string().trim().max(100).optional(), status: z.enum(SOURCE_VERIFICATION_STATUSES).optional(), origin: z.enum(['admin', 'registry', 'editorial', 'discovered']).optional() }), req.query);
    const all = await listSourcesWithStats(db);
    const needle = q.search?.toLowerCase();
    res.json(all.filter((s) => (!q.status || s.verificationStatus === q.status) && (!q.origin || s.origin === q.origin) && (!needle || `${s.title} ${s.publisher} ${s.url}`.toLowerCase().includes(needle))));
  });

  r.get('/summary', auth.requirePermission('content:read'), async (_req, res) => {
    res.json(await sourceSummary(db));
  });

  r.get('/:id/events', auth.requirePermission('content:read'), async (req, res) => {
    res.json(await recentSourceEvents(db, parse(idParam, req.params.id)));
  });

  // The existing "Add a source" form. A URL that is already registered (under
  // any spelling) is refused so the list never holds duplicates.
  r.post('/', auth.requirePermission('content:write'), async (req, res) => {
    const body = parse(sourceFields, req.body);
    const canonical = canonicalizeUrl(body.url);
    if (!canonical) throw badRequest('Not a valid URL');
    const [dup] = await db.select({ id: factSources.id, title: factSources.title }).from(factSources).where(eq(factSources.canonicalUrl, canonical));
    if (dup) throw conflict(`This URL is already registered as "${dup.title}"`);
    const [row] = await db
      .insert(factSources)
      .values({ ...body, accessedOn: body.accessedOn ?? null, notes: body.notes ?? null, canonicalUrl: canonical, origin: 'admin', adminEdited: true, verificationStatus: 'pending_review' })
      .returning();
    await audit(db, req.admin!.id, 'source.created', 'fact_source', row!.id, { title: body.title });
    res.status(201).json(row);
  });

  r.patch('/:id', auth.requirePermission('content:write'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const wording = parse(sourceFields.partial(), req.body);
    const decision = parse(decisionFields, req.body);
    const [existing] = await db.select().from(factSources).where(eq(factSources.id, id));
    if (!existing) throw notFound('Source not found');
    const wantsDecision = Object.keys(decision).length > 0;
    if (wantsDecision && !req.admin!.permissions.has('content:publish')) throw badRequest('Only administrators who can publish content may change a source\'s licence status');

    const patch: Partial<typeof factSources.$inferInsert> = { updatedAt: new Date() };
    if (Object.keys(wording).length) {
      Object.assign(patch, wording);
      patch.adminEdited = true; // from now on the registry never rewrites this wording
      if (wording.url) {
        const canonical = canonicalizeUrl(wording.url);
        if (!canonical) throw badRequest('Not a valid URL');
        const [dup] = await db.select({ id: factSources.id }).from(factSources).where(eq(factSources.canonicalUrl, canonical));
        if (dup && dup.id !== id) throw conflict('Another source already uses this URL');
        patch.canonicalUrl = canonical;
      }
    }
    if (wantsDecision) {
      const merged = { ...existing, ...decision };
      if (decision.licenceName) patch.licenceName = decision.licenceName;
      if (decision.licenceUrl) patch.licenceUrl = decision.licenceUrl;
      if (decision.verificationEvidenceUrl) patch.verificationEvidenceUrl = decision.verificationEvidenceUrl;
      if (decision.ingestionSuspended !== undefined) {
        patch.ingestionSuspended = decision.ingestionSuspended;
        patch.suspensionReason = decision.ingestionSuspended ? `admin: suspended by ${req.admin!.email}` : null;
      }
      if (decision.statusLocked !== undefined) patch.statusLocked = decision.statusLocked;
      if (decision.verificationStatus) {
        if (decision.verificationStatus === 'approved' && (!merged.licenceName || !merged.verificationEvidenceUrl)) throw badRequest('Approving a source needs the licence name and the evidence URL you checked');
        patch.verificationStatus = decision.verificationStatus;
        patch.licenceVerified = decision.verificationStatus === 'approved' || decision.verificationStatus === 'restricted';
        patch.statusLocked = decision.statusLocked ?? true; // the automation must not override a person's decision
        patch.lastVerifiedAt = new Date();
        if (decision.verificationStatus === 'approved' && decision.ingestionSuspended === undefined) {
          patch.ingestionSuspended = false;
          patch.suspensionReason = null;
        }
        patch.notes = withValidation(wording.notes ?? existing.notes, `${decision.verificationStatus} — decided by an administrator on ${new Date().toISOString().slice(0, 10)}.`);
        await db.insert(sourceVerificationEvents).values({ sourceId: id, trigger: 'manual', outcome: 'verified', fromStatus: existing.verificationStatus, toStatus: decision.verificationStatus, detail: `Administrator decision by ${req.admin!.email}`.slice(0, 500) });
      }
    }
    const [row] = await db.update(factSources).set(patch).where(eq(factSources.id, id)).returning();
    await audit(db, req.admin!.id, 'source.updated', 'fact_source', id, { changed: [...Object.keys(wording), ...Object.keys(decision)] });
    res.json(row);
  });

  // Exceptional manual check; routine verification needs no one.
  r.post('/:id/verify', auth.requirePermission('content:verify'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const result = await verifyNow(db, id, runtime());
    if (!result) throw notFound('Source not found');
    await audit(db, req.admin!.id, 'source.verify_now', 'fact_source', id, { outcome: result.outcome, to: result.to });
    const [row] = await db.select().from(factSources).where(eq(factSources.id, id));
    res.json({ result, source: row });
  });

  // Runs the whole maintenance job now (in the background; results appear in the list).
  r.post('/maintenance/run', auth.requirePermission('content:publish'), async (req, res) => {
    const rt = runtime();
    void runMaintenance(db, rt, { trigger: 'manual', force: true }).catch((err) => rt.log(`manual maintenance failed: ${err instanceof Error ? err.message : 'error'}`));
    await audit(db, req.admin!.id, 'source.maintenance_run', 'fact_source', null, {});
    res.status(202).json({ started: true });
  });

  r.post('/:id/ingest', auth.requirePermission('content:publish'), async (req, res) => {
    const id = parse(idParam, req.params.id);
    const [s] = await db.select({ id: factSources.id }).from(factSources).where(eq(factSources.id, id));
    if (!s) throw notFound('Source not found');
    const report = await runIngestion(db, runtime(), { maxPerRun: env.FACT_INGEST_MAX_PER_RUN, autoPublish: env.FACT_INGEST_AUTO_PUBLISH, sourceId: id });
    await audit(db, req.admin!.id, 'source.ingest', 'fact_source', id, { created: report.created });
    res.json(report);
  });

  return r;
}

