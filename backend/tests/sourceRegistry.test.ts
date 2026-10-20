import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { factSources, facts, sourceVerificationEvents } from '../src/database/schema.js';
import { SOURCE_REGISTRY } from '../src/catalogue/sourceRegistry.js';
import { FACT_TOPICS, FACT_CATEGORIES } from '../src/catalogue/factCategories.js';
import { canonicalizeUrl } from '../src/lib/url.js';
import { assertSafeUrl, parseRobots, robotsAllows, safeFetchText } from '../src/lib/safeFetch.js';
import { assessAge, cleanExtract, isSupportedBy, isUnsuitable, jaccard, runIngestion, significant } from '../src/services/factIngestService.js';
import { buildHostAllowed, runMaintenance, runtimeFromEnv, seedSourceRegistry, verifyNow, withValidation, type RegistryRuntime } from '../src/services/sourceRegistryService.js';
import { maintenanceCycle } from '../src/services/sourceScheduler.js';
import { listFactsForChild } from '../src/services/catalogueService.js';
import { DEFAULT_CONTROLS } from '../src/services/controlsService.js';
import { adminToken, createAdmin, setupTestApp } from './helpers.js';
import { addChild, as, birthMonthForAge, playerLogin, registerGuardian, subscribe } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;

// ---- a fake internet -------------------------------------------------------
type Page = { status?: number; body: string; headers?: Record<string, string> };
const web = new Map<string, Page>();
const calls: string[] = [];
let networkDown = false;

const fakeFetch = (async (input: string | URL | Request) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  calls.push(url);
  if (networkDown) throw new TypeError('fetch failed');
  const page = web.get(url);
  if (!page) return new Response('not found', { status: 404 });
  return new Response(page.body, { status: page.status ?? 200, headers: page.headers });
}) as typeof fetch;

const rt = (over: Partial<RegistryRuntime> = {}): RegistryRuntime => ({
  ...runtimeFromEnv(ctx.deps.env, { fetchImpl: fakeFetch, resolve: async () => ['93.184.216.34'], sleep: async () => undefined, minIntervalMs: 0, retries: 1 }),
  log: () => undefined,
  ...over,
});

/** Evidence pages that contain exactly the wording the registry looks for. */
function publishEvidence(opts: { except?: string[]; extra?: Record<string, string> } = {}) {
  for (const e of SOURCE_REGISTRY) {
    if (e.kind !== 'content' || opts.except?.includes(e.key)) continue;
    web.set(e.evidenceUrl, { body: `<html><body><h1>Terms</h1><p>${e.approveMarkers.join(' — ')}. ${opts.extra?.[e.key] ?? ''}</p></body></html>` });
  }
}

const wiki = (title: string, extract: string, type = 'standard') =>
  JSON.stringify({ type, title, extract, content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}` } } });

const sourceByKey = async (key: string) => (await ctx.db.select().from(factSources).where(eq(factSources.sourceKey, key)))[0]!;

beforeAll(async () => {
  ctx = await setupTestApp();
});
afterAll(async () => {
  await ctx.close();
});

describe('seeding', () => {
  it('a clean database automatically receives the initial sources, unverified, using the Add-a-source fields', async () => {
    // setupTestApp migrated an empty schema and ran seedCatalogue: nothing was entered by hand.
    const rows = await ctx.db.select().from(factSources).where(eq(factSources.origin, 'registry'));
    expect(rows).toHaveLength(33);
    expect(new Set(rows.map((r) => r.sourceKey)).size).toBe(33);
    expect(new Set(rows.map((r) => r.canonicalUrl)).size).toBe(33);
    for (const r of rows) {
      // the same six fields as the console form
      expect(r.publisher.length).toBeGreaterThan(0);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.url.startsWith('https://')).toBe(true);
      expect(r.notes).toContain('[Validation]');
      expect(r.notes).toMatch(/Subjects:/);
      // never claimed as verified without evidence
      expect(r.licenceVerified).toBe(false);
      expect(r.verificationStatus).not.toBe('approved');
      expect(r.lastVerifiedAt).toBeNull();
      expect(r.accessedOn).toBeNull();
    }
    const urls = rows.map((r) => r.url);
    for (const must of ['https://www.wikidata.org/', 'https://query.wikidata.org/', 'https://en.wikipedia.org/w/api.php', 'https://api.nasa.gov/', 'https://ourworldindata.org/', 'https://www.fao.org/', 'https://knowindia.india.gov.in/']) expect(urls).toContain(must);
    // content sources wait for evidence; documentation and per-item-licence entries are excluded by policy
    expect(rows.filter((r) => r.verificationStatus === 'pending_review').length).toBe(SOURCE_REGISTRY.filter((e) => e.kind === 'content').length);
    expect(rows.filter((r) => r.verificationStatus === 'restricted').length).toBe(SOURCE_REGISTRY.filter((e) => e.kind !== 'content').length);
    // seeding recorded an audit event per source
    const events = await ctx.db.select().from(sourceVerificationEvents);
    expect(events.filter((e) => e.outcome === 'seeded').length).toBeGreaterThanOrEqual(33);
  });

  it('re-running initialisation creates no duplicates', async () => {
    const before = (await ctx.db.select().from(factSources)).length;
    const a = await seedSourceRegistry(ctx.db);
    const b = await seedSourceRegistry(ctx.db);
    expect(a.inserted).toBe(0);
    expect(b.inserted).toBe(0);
    expect((await ctx.db.select().from(factSources)).length).toBe(before);
  });

  it('keeps administrator-edited records and notes, and only updates verification metadata', async () => {
    const wd = await sourceByKey('wikidata');
    await ctx.db.update(factSources).set({ title: 'Wikidata (our wording)', notes: 'Our own note about Wikidata.', adminEdited: true }).where(eq(factSources.id, wd.id));
    // a registry definition that changed upstream must not overwrite the admin's wording
    const changed = SOURCE_REGISTRY.map((e) => (e.key === 'wikidata' ? { ...e, title: 'Wikidata renamed upstream', caveat: 'changed' } : e));
    await seedSourceRegistry(ctx.db, changed);
    const after = await sourceByKey('wikidata');
    expect(after.title).toBe('Wikidata (our wording)');
    expect(after.notes).toBe('Our own note about Wikidata.');
    // a later verification updates the machine-managed line but keeps the admin's text
    publishEvidence();
    await verifyNow(ctx.db, wd.id, rt());
    const verified = await sourceByKey('wikidata');
    expect(verified.verificationStatus).toBe('approved');
    expect(verified.notes!.startsWith('Our own note about Wikidata.')).toBe(true);
    expect(verified.notes).toContain('[Validation] approved');
    expect(verified.title).toBe('Wikidata (our wording)');
    expect(withValidation(verified.notes, 'x').match(/\[Validation\]/g)).toHaveLength(1);
  });

  it('adopts a hand-added source that has the same URL instead of duplicating it, without touching its wording', async () => {
    const [mine] = await ctx.db.insert(factSources).values({ title: 'My ESA note', publisher: 'Me', url: 'https://www.esa.int/', canonicalUrl: null, notes: 'handwritten', origin: 'admin' }).returning();
    // two rows with the same canonical url cannot exist; remove the registry copy to simulate "admin added first"
    await ctx.db.delete(factSources).where(eq(factSources.sourceKey, 'esa')).catch(() => undefined);
    const r = await seedSourceRegistry(ctx.db);
    const rows = await ctx.db.select().from(factSources).where(eq(factSources.canonicalUrl, 'https://esa.int'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(mine!.id);
    expect(rows[0]!.sourceKey).toBe('esa');
    expect(rows[0]!.title).toBe('My ESA note');
    expect(rows[0]!.notes).toBe('handwritten');
    expect(r.inserted + r.attached).toBeGreaterThanOrEqual(0);
  });

  it('canonicalises equivalent URLs the same way', () => {
    expect(canonicalizeUrl('http://WWW.Wikidata.org:443/?utm_source=x#frag')).toBe('https://wikidata.org');
    expect(canonicalizeUrl('https://en.wikipedia.org/w/api.php/')).toBe('https://en.wikipedia.org/w/api.php');
    expect(canonicalizeUrl('ftp://example.org')).toBeNull();
  });
});

describe('licence verification', () => {
  it('approves only when the evidence page actually carries the licence wording', async () => {
    web.clear();
    publishEvidence({ except: ['usgs'] }); // the USGS page loads but lacks the licence statement
    web.set('https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits', { body: '<html>Welcome to the USGS</html>' });
    const report = await runMaintenance(ctx.db, rt(), { trigger: 'scheduled', force: true });
    expect(report.failed).toBe(0);
    const usgs = await sourceByKey('usgs');
    expect(usgs.verificationStatus).toBe('pending_review'); // reachable is not verified
    expect(usgs.licenceVerified).toBe(false);
    expect(usgs.notes).toContain('expected licence wording was not found');
    const wp = await sourceByKey('wikipedia-api');
    expect(wp.verificationStatus).toBe('approved');
    expect(wp.licenceVerified).toBe(true);
    expect(wp.shareAlikeRequired).toBe(true);
    expect(wp.attributionRequired).toBe(true);
    expect(wp.lastVerifiedAt).not.toBeNull();
    expect(wp.accessedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(wp.verificationEvidenceUrl).toBe('https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use');
    // mixed-licence sources are never auto-approved even when their wording is present
    const owid = await sourceByKey('owid');
    expect(owid.verificationStatus).toBe('pending_review');
    expect(owid.notes).toContain('mixed or per-item licences');
    // documentation and per-item-licence entries stay excluded
    expect((await sourceByKey('wikidata-data-access')).verificationStatus).toBe('restricted');
    expect((await sourceByKey('inaturalist')).verificationStatus).toBe('restricted');
  });

  it('marks a source restricted when a non-commercial term is found, and suspends its ingestion', async () => {
    publishEvidence({ extra: { fao: 'Licensed under CC BY-NC-SA 3.0 IGO (NonCommercial).' } });
    await runMaintenance(ctx.db, rt(), { trigger: 'scheduled', force: true });
    const fao = await sourceByKey('fao');
    expect(fao.verificationStatus).toBe('restricted');
    expect(fao.commercialUseAllowed).toBe(false);
    expect(fao.ingestionSuspended).toBe(true);
    expect(fao.suspensionReason).toContain('NonCommercial');
  });

  it('does not re-fetch sources inside their check interval', async () => {
    calls.length = 0;
    const r = await runMaintenance(ctx.db, rt(), { trigger: 'scheduled' });
    expect(r.checked).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('detects changed licence evidence: suspends ingestion, keeps stored facts and history', async () => {
    await ctx.db.update(factSources).set({ sourceKey: 'nasa-science' }).where(eq(factSources.sourceKey, 'nasa-science'));
    const nasa = await sourceByKey('nasa-science');
    expect(nasa.verificationStatus).toBe('approved');
    const [fact] = await ctx.db
      .insert(facts)
      .values({ slug: 'nasa-test-fact', category: 'space', headline: 'A test fact from NASA', body: 'Stored before the licence changed.', brackets: ['D'], sourceId: nasa.id, status: 'published', verifiedAt: new Date(), publishedAt: new Date(), ingestionKind: 'ingested', sourceUrl: 'https://science.nasa.gov/x', attributionText: 'Source: NASA', licenceName: nasa.licenceName })
      .returning();
    // the page changes: the licence sentence is gone
    web.set('https://www.nasa.gov/nasa-brand-center/images-and-media/', { body: '<html>Media usage policy has moved.</html>' });
    const r = await runMaintenance(ctx.db, rt(), { trigger: 'scheduled', force: true });
    expect(r.suspended).toBeGreaterThanOrEqual(1);
    const after = await sourceByKey('nasa-science');
    expect(after.verificationStatus).toBe('pending_review');
    expect(after.ingestionSuspended).toBe(true);
    expect(after.evidenceChangedAt).not.toBeNull();
    expect(after.licenceVerified).toBe(true); // previously verified; flagged, not erased
    // history is kept and nothing was deleted
    const ev = await ctx.db.select().from(sourceVerificationEvents).where(eq(sourceVerificationEvents.sourceId, nasa.id));
    expect(ev.map((e) => e.outcome)).toEqual(expect.arrayContaining(['seeded', 'verified', 'suspended']));
    expect((await ctx.db.select().from(facts).where(eq(facts.id, fact!.id))).length).toBe(1);
    // the licence text returns: ingestion resumes by itself
    publishEvidence();
    await runMaintenance(ctx.db, rt(), { trigger: 'scheduled', force: true });
    const resumed = await sourceByKey('nasa-science');
    expect(resumed.verificationStatus).toBe('approved');
    expect(resumed.ingestionSuspended).toBe(false);
  });

  it('never overrides a status an administrator locked', async () => {
    const who = await sourceByKey('who');
    await ctx.db.update(factSources).set({ statusLocked: true, verificationStatus: 'pending_review' }).where(eq(factSources.id, who.id));
    publishEvidence({ extra: { who: 'NonCommercial' } });
    const res = await verifyNow(ctx.db, who.id, rt());
    expect(res!.outcome).toBe('unchanged');
    expect((await sourceByKey('who')).verificationStatus).toBe('pending_review');
    expect((await sourceByKey('who')).notes).toContain('status locked by an administrator');
  });
});

describe('broken sources and unsafe requests', () => {
  it('handles unreachable, erroring and vanished sources without crashing the run', async () => {
    web.clear();
    await ctx.db.update(factSources).set({ lastCheckedAt: null, consecutiveFailures: 0, statusLocked: false }).where(eq(factSources.origin, 'registry'));
    networkDown = true;
    const down = await runMaintenance(ctx.db, rt(), { trigger: 'scheduled', force: true });
    networkDown = false;
    expect(down.failed).toBeGreaterThan(0);
    expect(down.errors.length).toBeGreaterThan(0);
    const wd = await sourceByKey('wikidata');
    expect(wd.lastCheckError).toMatch(/network|robots/);
    expect(wd.consecutiveFailures).toBeGreaterThanOrEqual(1);
    // 5xx on a source that was never verified (an approved one would stay approved: see the next test)
    await ctx.db.update(factSources).set({ verificationStatus: 'pending_review', licenceVerified: false, consecutiveFailures: 0 }).where(eq(factSources.id, wd.id));
    web.set('https://www.wikidata.org/wiki/Wikidata:Licensing', { status: 503, body: 'down' });
    await verifyNow(ctx.db, wd.id, rt());
    expect((await sourceByKey('wikidata')).verificationStatus).toBe('verification_failed');
    // 404: the evidence page is gone
    web.set('https://www.wikidata.org/wiki/Wikidata:Licensing', { status: 404, body: '' });
    await verifyNow(ctx.db, wd.id, rt());
    expect((await sourceByKey('wikidata')).verificationStatus).toBe('unavailable');
  });

  it('keeps an approved source approved through transient failures, and keeps its facts deliverable', async () => {
    web.clear();
    publishEvidence();
    const wp = await sourceByKey('wikipedia-api');
    await verifyNow(ctx.db, wp.id, rt());
    expect((await sourceByKey('wikipedia-api')).verificationStatus).toBe('approved');
    networkDown = true;
    for (let i = 0; i < 3; i++) await verifyNow(ctx.db, wp.id, rt());
    networkDown = false;
    const still = await sourceByKey('wikipedia-api');
    expect(still.verificationStatus).toBe('approved');
    expect(still.lastCheckError).toBeTruthy();
    expect(still.consecutiveFailures).toBe(3);
  });

  it('refuses SSRF: http, private addresses, localhost, credentials, odd ports and non-allow-listed hosts', async () => {
    const o = { hostAllowed: buildHostAllowed(), resolve: async () => ['93.184.216.34'] };
    await expect(assertSafeUrl('http://www.nasa.gov/x', o)).rejects.toThrow(/https/);
    await expect(assertSafeUrl('https://127.0.0.1/', o)).rejects.toThrow();
    await expect(assertSafeUrl('https://localhost/', o)).rejects.toThrow();
    await expect(assertSafeUrl('https://user:pw@www.nasa.gov/', o)).rejects.toThrow(/credentials/);
    await expect(assertSafeUrl('https://www.nasa.gov:8443/', o)).rejects.toThrow(/ports/);
    await expect(assertSafeUrl('https://evil.example.com/', o)).rejects.toThrow(/allow-list/);
    await expect(assertSafeUrl('https://www.nasa.gov/', { ...o, resolve: async () => ['10.0.0.5'] })).rejects.toThrow(/private/);
    await expect(assertSafeUrl('https://www.nasa.gov/', { ...o, resolve: async () => ['169.254.169.254'] })).rejects.toThrow(/private/);
    await expect(assertSafeUrl('https://www.nasa.gov/', o)).resolves.toBeInstanceOf(URL);
  });

  it('does not follow a redirect to a host that is not allowed, and honours robots.txt', async () => {
    web.clear();
    web.set('https://www.nasa.gov/a', { status: 302, body: '', headers: { location: 'https://evil.example.com/steal' } });
    const base = { userAgent: 'LoJiSourceBot/1.0', timeoutMs: 2000, maxBytes: 1000, retries: 0, hostAllowed: buildHostAllowed(), fetchImpl: fakeFetch, resolve: async () => ['93.184.216.34'], sleep: async () => undefined };
    await expect(safeFetchText('https://www.nasa.gov/a', base)).rejects.toThrow(/allow-list/);
    web.set('https://www.nasa.gov/robots.txt', { body: 'User-agent: *\nDisallow: /private\nAllow: /private/ok' });
    web.set('https://www.nasa.gov/private/x', { body: 'secret' });
    await expect(safeFetchText('https://www.nasa.gov/private/x', { ...base, respectRobots: true })).rejects.toThrow(/robots/);
    web.set('https://www.nasa.gov/private/ok', { body: 'fine' });
    expect((await safeFetchText('https://www.nasa.gov/private/ok', { ...base, respectRobots: true })).text).toBe('fine');
    const rules = parseRobots('User-agent: LoJiSourceBot\nDisallow: /x\n\nUser-agent: *\nDisallow: /', 'LoJiSourceBot/1.0');
    expect(robotsAllows(rules, '/x/y')).toBe(false);
    expect(robotsAllows(rules, '/y')).toBe(true);
    web.set('https://www.nasa.gov/big', { body: 'x'.repeat(5000) });
    await expect(safeFetchText('https://www.nasa.gov/big', base)).rejects.toThrow(/larger/);
  });
});

describe('discovery', () => {
  it('registers candidates only from allowed domains and never approves them', async () => {
    web.clear();
    web.set('https://data.nasa.gov/feed.json', { body: JSON.stringify([{ publisher: 'NASA Open Data', title: 'NASA Open Data Portal', url: 'https://data.nasa.gov/' }, { publisher: 'Evil', title: 'Bad', url: 'https://evil.example.com/' }, { publisher: 'x', title: 'http only', url: 'http://data.nasa.gov/insecure' }]) });
    const r = rt({ discovery: { feeds: ['https://data.nasa.gov/feed.json'], allowedDomains: ['nasa.gov'], maxPerRun: 5 } });
    const report = await runMaintenance(ctx.db, r, { trigger: 'scheduled', force: true });
    expect(report.discovered).toBe(1);
    const [row] = await ctx.db.select().from(factSources).where(eq(factSources.canonicalUrl, 'https://data.nasa.gov'));
    expect(row!.origin).toBe('discovered');
    expect(row!.verificationStatus).toBe('pending_review');
    expect(row!.licenceVerified).toBe(false);
    // a second run finds the same candidate and adds nothing
    expect((await runMaintenance(ctx.db, r, { trigger: 'scheduled', force: true })).discovered).toBe(0);
  });
});

describe('fact ingestion', () => {
  const BLUE_WHALE = 'The blue whale (Balaenoptera musculus) is a marine mammal and a baleen whale. Reaching a maximum confirmed length of 29.9 metres and weighing up to 199 tonnes, it is the largest animal known ever to have existed.';

  it('an unverified source cannot supply production facts', async () => {
    web.clear();
    const wp = await sourceByKey('wikipedia-api');
    await ctx.db.update(factSources).set({ verificationStatus: 'pending_review', licenceVerified: false, statusLocked: false }).where(eq(factSources.id, wp.id));
    web.set('https://en.wikipedia.org/api/rest_v1/page/summary/Blue_whale', { body: wiki('Blue whale', BLUE_WHALE) });
    calls.length = 0;
    const report = await runIngestion(ctx.db, rt(), { maxPerRun: 5, autoPublish: true });
    expect(report.created).toBe(0);
    expect(report.sources[0]!.skippedReason).toMatch(/pending_review/);
    expect(calls.filter((c) => c.includes('/page/summary/'))).toHaveLength(0); // it did not even fetch content
    // a fact that was somehow stored against an unverified source is still not shown to children
    const [stray] = await ctx.db.insert(facts).values({ slug: 'stray-ingested', category: 'animals', headline: 'Stray', body: 'Stray fact from an unverified source.', brackets: ['D'], sourceId: wp.id, status: 'published', verifiedAt: new Date(), publishedAt: new Date(), ingestionKind: 'ingested', sourceUrl: 'https://en.wikipedia.org/wiki/X', attributionText: 'x' }).returning();
    const shown = await listFactsForChild(ctx.db, 'D', { ...DEFAULT_CONTROLS, childId: 'x', updatedAt: new Date() }, 'animals');
    expect(shown.find((f) => f.id === stray!.id)).toBeUndefined();
    // and an editor cannot publish it from the console
    await createAdmin(ctx.db, 'super_admin', 'root@example.com');
    const token = await adminToken(ctx.app, 'root@example.com');
    await ctx.db.update(facts).set({ status: 'verified' }).where(eq(facts.id, stray!.id));
    const res = await request(ctx.app).post(`/admin/v1/facts/${stray!.id}/status`).set(as(token)).send({ status: 'published' });
    expect(res.status).toBe(400);
  });

  it('a restricted source supplies nothing and its stored facts are hidden', async () => {
    const wp = await sourceByKey('wikipedia-api');
    await ctx.db.update(factSources).set({ verificationStatus: 'restricted', licenceVerified: true, ingestionSuspended: true }).where(eq(factSources.id, wp.id));
    const report = await runIngestion(ctx.db, rt(), { maxPerRun: 5, autoPublish: true });
    expect(report.created).toBe(0);
    const [stray] = await ctx.db.select().from(facts).where(eq(facts.slug, 'stray-ingested'));
    await ctx.db.update(facts).set({ status: 'published', publishedAt: new Date() }).where(eq(facts.id, stray!.id));
    const shown = await listFactsForChild(ctx.db, 'D', { ...DEFAULT_CONTROLS, childId: 'x', updatedAt: new Date() }, 'animals');
    expect(shown.find((f) => f.slug === 'stray-ingested')).toBeUndefined();
  });

  it('creates traceable, attributed facts from an approved source, with Hindi, and rejects unsuitable or duplicate ones', async () => {
    web.clear();
    publishEvidence();
    const wp = await sourceByKey('wikipedia-api');
    await ctx.db.update(factSources).set({ verificationStatus: 'pending_review', licenceVerified: false, ingestionSuspended: false, suspensionReason: null, statusLocked: false }).where(eq(factSources.id, wp.id));
    await verifyNow(ctx.db, wp.id, rt());
    expect((await sourceByKey('wikipedia-api')).verificationStatus).toBe('approved');

    web.set('https://en.wikipedia.org/api/rest_v1/page/summary/Blue_whale', { body: wiki('Blue whale', BLUE_WHALE) });
    web.set('https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=hi&redirects=1&format=json&formatversion=2&titles=Blue%20whale', { body: JSON.stringify({ query: { pages: [{ langlinks: [{ lang: 'hi', title: 'नीली व्हेल' }] }] } }) });
    web.set(`https://hi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent('नीली_व्हेल')}`, { body: JSON.stringify({ type: 'standard', title: 'नीली व्हेल', extract: 'नीली व्हेल एक समुद्री स्तनधारी है। यह पृथ्वी का सबसे बड़ा जीव है।', content_urls: { desktop: { page: 'https://hi.wikipedia.org/wiki/नीली_व्हेल' } } }) });
    web.set('https://en.wikipedia.org/api/rest_v1/page/summary/Cheetah', { body: wiki('Cheetah', 'The cheetah is a large cat that kills small antelopes. It runs very fast over short distances.') }); // unsuitable word
    web.set('https://en.wikipedia.org/api/rest_v1/page/summary/Sunflower', { body: wiki('Sunflower', 'Sunflower may refer to several things.', 'disambiguation') });

    const report = await runIngestion(ctx.db, rt(), { maxPerRun: 10, autoPublish: false });
    const entry = report.sources[0]!;
    expect(entry.created).toBe(1);
    expect(entry.rejected.age_inappropriate).toBe(1);
    expect(entry.rejected.no_article).toBeGreaterThan(0);

    const [f] = await ctx.db.select().from(facts).where(eq(facts.slug, 'wiki-blue-whale'));
    expect(f).toBeDefined();
    expect(f!.sourceId).toBe(wp.id);
    expect(f!.ingestionKind).toBe('ingested');
    expect(f!.status).toBe('verified'); // not auto-published: FACT_INGEST_AUTO_PUBLISH is off
    expect(f!.claimCheck).toBe('source_supported');
    expect(f!.sourceUrl).toBe('https://en.wikipedia.org/wiki/Blue_whale');
    expect(f!.supportingReference).toContain('Balaenoptera musculus'); // the verbatim source passage
    expect(f!.body).not.toContain('Balaenoptera'); // parenthetical stripped from the child text
    expect(isSupportedBy(f!.body, BLUE_WHALE)).toBe(true);
    expect(f!.licenceName).toBe('CC BY-SA 4.0');
    expect(f!.attributionText).toContain('Wikipedia');
    expect(f!.attributionText).toContain('CC BY-SA 4.0');
    expect(f!.attributionText).toContain(f!.sourceUrl!);
    expect(f!.language).toBe('en');
    expect(f!.minimumAge).toBeGreaterThanOrEqual(3);
    expect(f!.maximumAge).toBe(12);
    expect(f!.reviewedAt).not.toBeNull();
    expect(f!.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(f!.translations.hi!.body).toContain('नीली व्हेल');
    expect(f!.supportingReference).toContain('hi.wikipedia.org'); // Hindi keeps its own reference

    // the same article again: skipped (already ingested); a re-worded copy is a near-duplicate
    const again = await runIngestion(ctx.db, rt(), { maxPerRun: 10, autoPublish: false });
    expect(again.created).toBe(0);
    await ctx.db.delete(facts).where(eq(facts.slug, 'wiki-blue-whale'));
    await ctx.db.insert(facts).values({ slug: 'blue-whale-manual', category: 'animals', headline: 'The blue whale is a marine mammal and a baleen whale', body: f!.body, brackets: ['D'], status: 'draft' });
    const dup = await runIngestion(ctx.db, rt(), { maxPerRun: 10, autoPublish: false });
    expect(dup.sources[0]!.rejected.near_duplicate).toBe(1);

    // sources record the ingestion in their history
    const ev = await ctx.db.select().from(sourceVerificationEvents).where(eq(sourceVerificationEvents.sourceId, wp.id));
    expect(ev.some((e) => e.outcome === 'ingested')).toBe(true);
  });

  it('publishes automatically only when FACT_INGEST_AUTO_PUBLISH is on, and only from an approved source', async () => {
    await ctx.db.delete(facts).where(eq(facts.slug, 'blue-whale-manual'));
    const report = await runIngestion(ctx.db, rt(), { maxPerRun: 10, autoPublish: true });
    expect(report.created).toBe(1);
    const [f] = await ctx.db.select().from(facts).where(eq(facts.slug, 'wiki-blue-whale'));
    expect(f!.status).toBe('published');
    expect(f!.publishedAt).not.toBeNull();
  });

  it('pure helpers: claim check, age review, cleaning and duplicate scoring', () => {
    expect(isSupportedBy('The sun is a star', 'The Sun (our nearest) is a star of great size')).toBe(true);
    expect(isSupportedBy('The sun is a blue star', 'The Sun is a star')).toBe(false); // an added claim is rejected
    expect(cleanExtract('The heart (Latin: cor) [1] pumps blood .')).toBe('The heart pumps blood.');
    expect(isUnsuitable('Many people died in the war')).toMatch(/died|war/);
    expect(isUnsuitable('Bees make honey')).toBeNull();
    expect(isUnsuitable('यह एक युद्ध था', 'hi')).toContain('युद्ध');
    expect(assessAge('Bees make honey. Honey is sweet.')!.bracket).toBe('A');
    expect(assessAge(Array(40).fill('extraordinarily').join(' ') + '.')).toBeNull();
    expect(jaccard(significant('The blue whale is the largest animal'), significant('Largest animal: the blue whale'))).toBeGreaterThan(0.7);
    expect(FACT_TOPICS).toHaveLength(15);
    for (const t of FACT_TOPICS) expect(FACT_CATEGORIES.some((c) => c.key === t.category)).toBe(true);
  });
});

describe('admin API: the existing "Add a source" form and the dashboard', () => {
  let editor = '';
  let checker = '';
  let root = '';
  beforeAll(async () => {
    await createAdmin(ctx.db, 'editor', 'editor@example.com');
    await createAdmin(ctx.db, 'fact_checker', 'checker@example.com');
    editor = await adminToken(ctx.app, 'editor@example.com');
    checker = await adminToken(ctx.app, 'checker@example.com');
    root = await adminToken(ctx.app, 'root@example.com');
    ctx.deps.sourceRuntime = { fetchImpl: fakeFetch, resolve: async () => ['93.184.216.34'], sleep: async () => undefined, minIntervalMs: 0, retries: 0 };
  });

  it('still adds a source with the six form fields, lists it with the automatic ones, edits it and refuses duplicates', async () => {
    const res = await request(ctx.app).post('/admin/v1/fact-sources').set(as(editor)).send({ publisher: 'Example Museum', title: 'Example Museum Kids', url: 'https://kids.example-museum.org/', accessedOn: '2026-10-10', notes: 'checked by hand' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ publisher: 'Example Museum', title: 'Example Museum Kids', accessedOn: '2026-10-10', notes: 'checked by hand', origin: 'admin', verificationStatus: 'pending_review', licenceVerified: false });
    const dup = await request(ctx.app).post('/admin/v1/fact-sources').set(as(editor)).send({ publisher: 'X', title: 'Y', url: 'https://www.kids.example-museum.org/#top' });
    expect(dup.status).toBe(409);
    expect((await request(ctx.app).post('/admin/v1/fact-sources').set(as(editor)).send({ publisher: 'X', title: 'Y', url: 'http://insecure.example.org' })).status).toBe(400);
    const list = await request(ctx.app).get('/admin/v1/fact-sources').set(as(editor));
    expect(list.status).toBe(200);
    expect(list.body.some((s: { url: string }) => s.url === 'https://kids.example-museum.org/')).toBe(true);
    expect(list.body.filter((s: { sourceKey: string | null }) => s.sourceKey !== null).length).toBe(33); // the automatic records are in the same list the form manages
    expect(list.body[0]).toHaveProperty('factCount');
    const patched = await request(ctx.app).patch(`/admin/v1/fact-sources/${res.body.id}`).set(as(editor)).send({ notes: 'edited note' });
    expect(patched.status).toBe(200);
    expect(patched.body.notes).toBe('edited note');
    expect(patched.body.adminEdited).toBe(true);
    // an editor may edit wording but not decide a licence
    expect((await request(ctx.app).patch(`/admin/v1/fact-sources/${res.body.id}`).set(as(editor)).send({ verificationStatus: 'approved' })).status).toBe(400);
    // a fact checker cannot add or edit sources
    expect((await request(ctx.app).post('/admin/v1/fact-sources').set(as(checker)).send({ publisher: 'X', title: 'Y', url: 'https://z.example.org' })).status).toBe(403);
    // unauthenticated is refused
    expect((await request(ctx.app).get('/admin/v1/fact-sources')).status).toBe(401);
  });

  it('lets a publisher approve a source with evidence, locking it against the automation', async () => {
    const [s] = await ctx.db.select().from(factSources).where(eq(factSources.canonicalUrl, 'https://kids.example-museum.org'));
    const bad = await request(ctx.app).patch(`/admin/v1/fact-sources/${s!.id}`).set(as(root)).send({ verificationStatus: 'approved' });
    expect(bad.status).toBe(400);
    const ok = await request(ctx.app).patch(`/admin/v1/fact-sources/${s!.id}`).set(as(root)).send({ verificationStatus: 'approved', licenceName: 'CC BY 4.0', verificationEvidenceUrl: 'https://kids.example-museum.org/licence' });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ verificationStatus: 'approved', licenceVerified: true, statusLocked: true });
  });

  it('"Verify now" works for a fact checker, is not needed for registration, and reports the result', async () => {
    web.clear();
    publishEvidence();
    const wd = await sourceByKey('wikidata');
    const res = await request(ctx.app).post(`/admin/v1/fact-sources/${wd.id}/verify`).set(as(checker));
    expect(res.status).toBe(200);
    expect(res.body.result.to).toBe('approved');
    expect(res.body.source.licenceVerified).toBe(true);
    expect((await request(ctx.app).post(`/admin/v1/fact-sources/${wd.id}/verify`).set(as(editor))).status).toBe(403); // editors lack content:verify
    const events = await request(ctx.app).get(`/admin/v1/fact-sources/${wd.id}/events`).set(as(editor));
    expect(events.body.length).toBeGreaterThan(0);
  });

  it('reports the dashboard numbers: totals, approved, awaiting review, restricted, errors', async () => {
    const res = await request(ctx.app).get('/admin/v1/fact-sources/summary').set(as(editor));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(33);
    expect(res.body.registeredAutomatically).toBeGreaterThanOrEqual(33);
    expect(res.body.approved).toBeGreaterThanOrEqual(1);
    expect(res.body).toHaveProperty('awaitingReview');
    expect(res.body).toHaveProperty('restricted');
    expect(res.body).toHaveProperty('lastSuccessfulVerificationAt');
    expect(Array.isArray(res.body.errors)).toBe(true);
    const dash = await request(ctx.app).get('/admin/v1/dashboard').set(as(root));
    expect(dash.body.sources.approved).toBe(res.body.approved);
  });
});

describe('children keep seeing approved cached facts when external services are down', () => {
  it('serves ingested facts from the database while every outside call fails; the app never calls a source', async () => {
    const wp = await sourceByKey('wikipedia-api');
    await ctx.db.update(factSources).set({ verificationStatus: 'approved', licenceVerified: true, ingestionSuspended: false }).where(eq(factSources.id, wp.id));
    const [fact] = await ctx.db
      .insert(facts)
      .values({ slug: 'wiki-cached-example', category: 'animals', headline: 'Cheetahs run very fast', body: 'Cheetahs run very fast over short distances.', brackets: ['B', 'C', 'D'], sourceId: wp.id, status: 'published', verifiedAt: new Date(), publishedAt: new Date(), ingestionKind: 'ingested', language: 'en', sourceUrl: 'https://en.wikipedia.org/wiki/Cheetah', supportingReference: 'The cheetah runs very fast over short distances.', licenceName: 'CC BY-SA 4.0', attributionText: 'Text from Wikipedia, "Cheetah", CC BY-SA 4.0.', claimCheck: 'source_supported', reviewedAt: new Date() })
      .returning();
    const guardian = await registerGuardian(ctx, '+919876590001');
    await subscribe(ctx, guardian.token);
    const kid = await addChild(ctx, guardian.token, { birthMonth: birthMonthForAge(11), pin: '4826' });
    const player = (await playerLogin(ctx, kid.playerId, '4826')).body.token as string;

    networkDown = true; // every external request now fails
    calls.length = 0;
    await runMaintenance(ctx.db, rt(), { trigger: 'scheduled', force: true });
    const list = await request(ctx.app).get('/v1/player/facts?category=animals').set(as(player));
    networkDown = false;
    expect(list.status).toBe(200);
    const shown = list.body.facts.find((f: { id: string }) => f.id === fact!.id);
    expect(shown).toBeDefined();
    expect(shown.attributionText).toContain('Wikipedia');
    expect(shown.sourceUrl).toBe('https://en.wikipedia.org/wiki/Cheetah');
    expect(shown.licenceName).toBe('CC BY-SA 4.0');
    expect(shown.source.publisher).toBe('Wikimedia Foundation');
    // the player request itself made no outside call (only the failed maintenance run did)
    const playerCalls = calls.length;
    await request(ctx.app).get('/v1/player/facts/daily').set(as(player));
    expect(calls.length).toBe(playerCalls);
    // internal fields are not exposed to children
    expect(shown).not.toHaveProperty('supportingReference');
    expect(shown).not.toHaveProperty('contentHash');
  });
});

describe('credentials stay on the server', () => {
  it('no key, secret or third-party endpoint reaches the app, the public API or the registry data', async () => {
    // 1. nothing in the app source calls a registered source
    const hosts = [...new Set(SOURCE_REGISTRY.map((s) => new URL(s.url).hostname))];
    const scan = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) return f === 'node_modules' ? [] : scan(p);
        return /\.(tsx?|json)$/.test(f) ? [p] : [];
      });
    const appFiles = scan(join(__dirname, '..', '..', 'src'));
    const offenders = appFiles.filter((f) => {
      const text = readFileSync(f, 'utf8');
      return hosts.some((h) => text.includes(`https://${h}/api`) || text.includes('api.nasa.gov') || text.includes('api_key='));
    });
    expect(offenders).toEqual([]);
    // 2. registry data holds no credentials
    const registryText = readFileSync(join(__dirname, '..', 'src', 'catalogue', 'sourceRegistry.ts'), 'utf8');
    expect(registryText).not.toMatch(/api[_-]?key\s*[:=]\s*['"][A-Za-z0-9]{12,}/i);
    expect(registryText).not.toMatch(/(secret|token|password)\s*[:=]\s*['"][A-Za-z0-9]{12,}/i);
    // 3. the public config and fact endpoints expose no secrets
    const cfg = JSON.stringify((await request(ctx.app).get('/v1/config')).body);
    for (const name of ['SECRET', 'SERVICE_ACCOUNT', 'AUTH_KEY', 'SOURCE_BOT_CONTACT', 'DATABASE_URL']) expect(cfg).not.toContain(name);
    // 4. the user agent never includes a credential
    expect(runtimeFromEnv(ctx.deps.env).userAgent).toMatch(/^LoJiSourceBot\/1\.0/);
  });
});

describe('scheduled cycle', () => {
  it('runs seed → verify → ingest as one idempotent job and survives a dead network', async () => {
    networkDown = true;
    const r = await maintenanceCycle(ctx.db, { ...ctx.deps.env, SOURCE_MAINTENANCE_ENABLED: true }, 'scheduled', { fetchImpl: fakeFetch, resolve: async () => ['93.184.216.34'], sleep: async () => undefined, minIntervalMs: 0, retries: 0, log: () => undefined });
    networkDown = false;
    expect(r.maintenance.seeded.inserted).toBe(0);
    expect(r.ingestion).not.toBeNull();
    expect((await ctx.db.select().from(factSources)).length).toBeGreaterThanOrEqual(34);
  });
});
