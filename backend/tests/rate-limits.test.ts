import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createRateLimits } from '../src/middleware/rateLimits.js';

// Students in one school often share a public IP: exam autosaves are limited
// per session, not per IP, while one session is still capped.
describe('rate limits for students behind one IP', () => {
  const app = express();
  const limits = createRateLimits(false);
  app.put('/save', limits.autosave, (_req, res) => void res.json({ ok: true }));
  const save = (token: string) => request(app).put('/save').set('authorization', `Bearer ${token}`);
  const tokenA = 'a'.repeat(43);
  const tokenB = 'b'.repeat(43);

  it('gives each session its own autosave budget', async () => {
    for (let i = 0; i < 240; i++) expect((await save(tokenA)).status).toBe(200);
    const over = await save(tokenA);
    expect(over.status).toBe(429);
    expect(over.body.error.code).toBe('rate_limited');
    // Another student on the same IP is not affected.
    expect((await save(tokenB)).status).toBe(200);
  });
});
