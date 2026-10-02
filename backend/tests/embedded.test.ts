import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../src/database/client.js';
import { syncBootstrapAdmin } from '../src/database/seedAdmin.js';
import { auth, setupTestApp } from './helpers.js';

describe('embedded database lock', () => {
  const dir = path.resolve('.data', `test-lock-${process.pid}`);
  beforeEach(() => mkdirSync(path.dirname(dir), { recursive: true }));
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(`${dir}.lock`, { force: true });
  });

  it('takes a lock while open and releases it on close', async () => {
    const first = createDatabase(`pglite:${dir}`);
    expect(existsSync(`${dir}.lock`)).toBe(true);
    expect(() => createDatabase(`pglite:${dir}`)).not.toThrow(); // the program that owns the lock is not blocked by itself
    await first.close();
    expect(existsSync(`${dir}.lock`)).toBe(false);
  });

  it('refuses when another live program holds the lock', () => {
    // PID 1 is always running and is never this process.
    mkdirSync(path.dirname(dir), { recursive: true });
    writeFileSync(`${dir}.lock`, '1');
    expect(() => createDatabase(`pglite:${dir}`)).toThrow(/in use by another running program/);
  });

  it('takes over a lock left behind by a program that is gone', async () => {
    writeFileSync(`${dir}.lock`, '999999999');
    const db = createDatabase(`pglite:${dir}`);
    expect(existsSync(`${dir}.lock`)).toBe(true);
    await db.close();
  });
});

describe('admin password from .env', () => {
  const login = (app: Parameters<typeof request>[0], email: string, password: string) =>
    request(app).post('/api/admin/auth/login').send({ email, password });

  it('applies a changed password once, keeps console changes, and re-applies only when .env changes', async () => {
    const ctx = await setupTestApp();
    const email = 'owner@example.com';
    try {
      expect((await syncBootstrapAdmin(ctx.db, email, 'First-Password-123')).changed).toBe(true);
      expect((await login(ctx.app, email, 'First-Password-123')).status).toBe(200);

      // Same .env on the next start: nothing to do.
      expect((await syncBootstrapAdmin(ctx.db, email, 'First-Password-123')).changed).toBe(false);

      // The owner changes the password inside the console...
      const token = (await login(ctx.app, email, 'First-Password-123')).body.token as string;
      const change = await request(ctx.app)
        .post('/api/admin/auth/password')
        .set(auth(token))
        .send({ currentPassword: 'First-Password-123', newPassword: 'Console-Password-456' });
      expect(change.status).toBe(204);
      // ...and a restart with the unchanged .env does not undo it.
      expect((await syncBootstrapAdmin(ctx.db, email, 'First-Password-123')).changed).toBe(false);
      expect((await login(ctx.app, email, 'Console-Password-456')).status).toBe(200);

      // Editing .env to a new password is applied on the next start.
      expect((await syncBootstrapAdmin(ctx.db, email, 'Edited-Password-789')).changed).toBe(true);
      expect((await login(ctx.app, email, 'Edited-Password-789')).status).toBe(200);
      expect((await login(ctx.app, email, 'Console-Password-456')).status).toBe(401);
    } finally {
      await ctx.close();
    }
  });

  it('rejects a weak password with a clear message', async () => {
    const ctx = await setupTestApp();
    try {
      await expect(syncBootstrapAdmin(ctx.db, 'weak@example.com', 'short1')).rejects.toThrow(/at least 12 characters/);
    } finally {
      await ctx.close();
    }
  });
});
