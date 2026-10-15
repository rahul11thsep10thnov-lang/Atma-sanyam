import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { accountDeletionRequests, children, guardians, otpChallenges } from '../src/database/schema.js';
import { runCleanup } from '../src/database/cleanup.js';
import { setupTestApp } from './helpers.js';
import { addChild, as, registerGuardian, subscribe } from './lojiHelpers.js';

let ctx: Awaited<ReturnType<typeof setupTestApp>>;

beforeAll(async () => {
  ctx = await setupTestApp();
});
afterAll(async () => {
  await ctx.close();
});

describe('deletion workflows', () => {
  it('completes child and account deletions after the cooling-off period', async () => {
    const g = await registerGuardian(ctx, '+919876550001');
    await subscribe(ctx, g.token);
    const a = await addChild(ctx, g.token, { displayName: 'A' });
    const b = await addChild(ctx, g.token, { displayName: 'B' });
    await request(ctx.app).delete(`/v1/guardian/children/${a.id}`).set(as(g.token)).expect(200);
    // Not due yet: nothing happens.
    let r = await runCleanup(ctx.db, ctx.deps.env);
    expect(r.deletedChildren).toBe(0);
    expect(await ctx.db.select().from(children).where(eq(children.id, a.id))).toHaveLength(1);
    // Due: the child row goes, its sibling stays.
    await ctx.db.update(accountDeletionRequests).set({ scheduledFor: new Date(Date.now() - 1000) }).where(eq(accountDeletionRequests.childId, a.id));
    r = await runCleanup(ctx.db, ctx.deps.env);
    expect(r.deletedChildren).toBe(1);
    expect(await ctx.db.select().from(children).where(eq(children.id, a.id))).toHaveLength(0);
    expect(await ctx.db.select().from(children).where(eq(children.id, b.id))).toHaveLength(1);

    // Whole account.
    await request(ctx.app).delete('/v1/guardian/me').set(as(g.token)).send({ password: g.password }).expect(200);
    await ctx.db.update(accountDeletionRequests).set({ scheduledFor: new Date(Date.now() - 1000) }).where(eq(accountDeletionRequests.guardianId, g.guardian.id));
    r = await runCleanup(ctx.db, ctx.deps.env);
    expect(r.deletedAccounts).toBe(1);
    expect(await ctx.db.select().from(guardians).where(eq(guardians.id, g.guardian.id))).toHaveLength(0);
    expect(await ctx.db.select().from(children).where(eq(children.id, b.id))).toHaveLength(0);
    // Codes older than a day are purged.
    await ctx.db.update(otpChallenges).set({ createdAt: new Date(Date.now() - 2 * 86_400_000) });
    r = await runCleanup(ctx.db, ctx.deps.env);
    expect(r.otpChallenges).toBeGreaterThan(0);
  });
});
