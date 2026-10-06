import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminToken, auth, setupTestApp } from './helpers.js';
import { SORT_KEYS } from '../src/services/questionService.js';

type Ctx = Awaited<ReturnType<typeof setupTestApp>>;

const HEADER = [
  'exam,subject,chapter,question,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,language',
  'external_id,topic_label,subtopic,concept,cognitive_level,question_type,year,variation_allowed,variation_rule,difficulty_label,answer_verified,ai_verified,verification_method,qa_grade,qa_flags,qa_fixes,source_name',
].join(',');

const q = (o: Record<string, string>) =>
  [
    'up-police-constable', o.subject ?? 'numerical-ability', o.chapter ?? 'percentage', JSON.stringify(o.question), ...['a', 'b', 'c', 'd'].map((k) => JSON.stringify(o[k] ?? '')),
    o.key ?? 'A', JSON.stringify(o.explanation ?? (o.language === 'en' ? '10% of 300 is 30, checked by direct calculation.' : 'यह उत्तर गणना से सीधे निकलता है और जाँचा गया है।')), o.difficulty ?? 'easy', o.language ?? 'hi',
    o.id ?? '', o.topic ?? '', o.subtopic ?? '', o.concept ?? '', o.level ?? '', 'MCQ', o.year ?? '', o.variation ?? '', '', o.label ?? '', o.verified ?? '', '', o.method ?? '', o.grade ?? '', '', '', o.source ?? '',
  ].join(',');

const csv = (rows: string[]) => `${HEADER}\n${rows.join('\n')}\n`;

describe('question bank columns: import, sort, filter', () => {
  let ctx: Ctx;
  let admin: string;
  const post = (content: string, dryRun = false) => request(ctx.app).post('/api/admin/imports').set(auth(admin)).send({ format: 'csv', content, dryRun });
  const list = (qs = '') => request(ctx.app).get(`/api/admin/questions?${qs}`).set(auth(admin));

  const rows = [
    q({ id: 'B-001', question: '500 का 20% कितना होता है?', a: '100', b: '50', c: '150', d: '200', key: 'A', topic: 'Percentage', subtopic: 'प्रतिशत', concept: 'प्रतिशत निकालना', level: 'Calculation', year: '2026', variation: 'true', label: 'Easy', verified: 'true', method: 'recomputed by program', grade: 'A', source: 'Bank X', difficulty: 'easy' }),
    q({ id: 'B-002', question: '800 का 15% कितना होता है?', a: '100', b: '120', c: '150', d: '90', key: 'B', topic: 'Percentage', subtopic: 'प्रतिशत', concept: 'प्रतिशत निकालना', level: 'Calculation', variation: 'false', label: 'Moderate', verified: 'true', method: 'recomputed by program', grade: 'C', source: 'Bank X', difficulty: 'medium' }),
    q({ id: 'B-003', subject: 'state-gk', chapter: 'geography', question: 'गंगा नदी किस राज्य से होकर बहती है?', a: 'उत्तर प्रदेश', b: 'गुजरात', c: 'पंजाब', d: 'राजस्थान', key: 'A', topic: 'Rivers', subtopic: 'नदियाँ', concept: 'नदी तंत्र', level: 'Recall', year: '2024', label: 'Easy', verified: 'false', method: 'read by Claude', grade: 'A', source: 'Bank Y', difficulty: 'easy' }),
    q({ id: 'B-004', question: 'Which is 10% of 300?', a: '30', b: '20', c: '40', d: '60', key: 'A', language: 'en', topic: 'Percentage', concept: 'percent of a number', level: 'Calculation', grade: 'A', difficulty: 'medium', label: 'Moderate' }),
    // no metadata at all: must sort last, whichever way
    q({ question: '50 का 10% कितना होता है?', a: '5', b: '10', c: '15', d: '20', key: 'A', chapter: 'profit-loss', difficulty: 'hard' }),
  ];

  beforeAll(async () => {
    ctx = await setupTestApp();
    admin = await adminToken(ctx.app, ctx.db);
  });
  afterAll(async () => {
    await ctx.close();
  });

  it('dry-runs, imports with the extra columns, and skips them when the same file is imported again', async () => {
    const dry = await post(csv(rows), true);
    expect(dry.body).toMatchObject({ dryRun: true, total: 5, imported: 5, failed: 0, skipped: 0 });
    expect((await list()).body.total).toBe(0);

    const res = await post(csv(rows));
    expect(res.body).toMatchObject({ imported: 5, failed: 0, skipped: 0 });
    expect((await list()).body.total).toBe(5);

    const again = await post(csv(rows));
    expect(again.body).toMatchObject({ imported: 1, skipped: 4, failed: 0 }); // only the row without an id is new
    expect((await list()).body.total).toBe(6);
  });

  it('returns every bank column on the list', async () => {
    const res = await list('externalId=B-001');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      externalId: 'B-001', topicLabel: 'Percentage', subtopic: 'प्रतिशत', concept: 'प्रतिशत निकालना', cognitiveLevel: 'Calculation', year: 2026,
      variationAllowed: true, difficultyLabel: 'Easy', answerVerified: true, verificationMethod: 'recomputed by program', qaGrade: 'A',
      sourceName: 'Bank X', usageCount: 0, status: 'needs_review',
    });
  });

  it('rejects a bad year or boolean with a clear message', async () => {
    const bad = await post(csv([q({ id: 'B-100', question: '10 का 10% कितना?', a: '1', b: '2', c: '3', d: '4', year: 'last year' }), q({ id: 'B-101', question: '20 का 10% कितना?', a: '1', b: '2', c: '3', d: '4', verified: 'maybe' })]), true);
    expect(bad.body.failed).toBe(2);
    expect(bad.body.rows[0].issues[0].message).toMatch(/year/);
    expect(bad.body.rows[1].issues[0].message).toMatch(/answer_verified/);
  });

  it('accepts the bilingual language and Hindi options that differ only in small words', async () => {
    const res = await post(
      csv([
        q({ id: 'B-200', question: 'Which is the correct sentence? / शुद्ध वाक्य चुनिए।', language: 'en-hi', subject: 'mental-ability', chapter: 'series', a: 'राम ने बाजार गया।', b: 'राम बाजार गया।', c: 'राम को बाजार गया।', d: 'राम बाजार गए।', key: 'B' }),
      ]),
      true
    );
    expect(res.body).toMatchObject({ imported: 1, failed: 0 });
  });

  it('does not call two questions with the same generic stem duplicates when their options differ', async () => {
    const a = q({ id: 'B-300', question: 'शुद्ध वाक्य चुनिए।', subject: 'mental-ability', chapter: 'series', a: 'वह कल आया था।', b: 'वह कल आया है था।', c: 'वह कल आएगा था।', d: 'वह कल आता था है।' });
    const b = q({ id: 'B-301', question: 'शुद्ध वाक्य चुनिए।', subject: 'mental-ability', chapter: 'series', a: 'मैं विद्यालय जाता हूँ।', b: 'मैं विद्यालय जाते हूँ।', c: 'मैं विद्यालय जाती हैं।', d: 'मैं विद्यालय गया हूँ हैं।' });
    const res = await post(csv([a, b]), true);
    expect(res.body.imported).toBe(2);
    expect(res.body.rows.flatMap((r: { issues: { code: string }[] }) => r.issues.map((i) => i.code))).not.toContain('POSSIBLE_DUPLICATE');
  });

  describe('sorting', () => {
    it('sorts on every allowed column in both directions without an error', async () => {
      for (const sort of SORT_KEYS)
        for (const dir of ['asc', 'desc']) {
          const res = await list(`sort=${sort}&dir=${dir}`);
          expect(res.status, `${sort} ${dir}`).toBe(200);
          expect(res.body.items).toHaveLength(6);
        }
    });

    it('orders by a text, a number and a boolean column, with empty values last either way', async () => {
      const ids = async (qs: string) => (await list(qs)).body.items.map((x: { externalId: string | null }) => x.externalId);
      const asc = await ids('sort=externalId&dir=asc');
      expect(asc.slice(0, 4)).toEqual(['B-001', 'B-002', 'B-003', 'B-004']);
      expect(asc[4]).toBeNull();
      const desc = await ids('sort=externalId&dir=desc');
      expect(desc.slice(0, 4)).toEqual(['B-004', 'B-003', 'B-002', 'B-001']);
      expect(desc[4]).toBeNull();
      expect((await ids('sort=year&dir=asc')).slice(0, 2)).toEqual(['B-003', 'B-001']); // 2024, 2026, then the rest
      expect((await ids('sort=year&dir=desc')).slice(0, 2)).toEqual(['B-001', 'B-003']);
      const ver = await list('sort=answerVerified&dir=desc');
      expect(ver.body.items.slice(0, 2).map((x: { answerVerified: boolean }) => x.answerVerified)).toEqual([true, true]);
    });

    it('orders by difficulty in its natural order and by usage', async () => {
      const diff = (await list('sort=difficulty&dir=asc')).body.items.map((x: { difficulty: string }) => x.difficulty);
      expect(diff.indexOf('easy')).toBeLessThan(diff.indexOf('medium'));
      expect(diff.indexOf('medium')).toBeLessThan(diff.indexOf('hard'));
      expect((await list('sort=usage&dir=desc')).status).toBe(200);
    });

    it('pages through a sorted list without repeating or losing a row', async () => {
      const seen: string[] = [];
      for (const page of [1, 2, 3]) {
        const res = await list(`sort=difficultyLabel&dir=asc&pageSize=2&page=${page}`);
        seen.push(...res.body.items.map((x: { id: string }) => x.id));
      }
      expect(new Set(seen).size).toBe(6);
    });

    it('refuses a sort key that is not a column of the bank', async () => {
      for (const bad of ['sort=password', 'sort=created;drop table questions', 'dir=sideways']) expect((await list(bad)).status).toBe(400);
      expect((await list('sort=created')).status).toBe(200);
    });
  });

  describe('filtering', () => {
    const total = async (qs: string) => (await list(qs)).body.total as number;
    it('filters on each bank column', async () => {
      expect(await total('externalId=B-00')).toBe(4);
      expect(await total('qaGrade=C')).toBe(1);
      expect(await total('qaGrade=A')).toBe(3);
      expect(await total('answerVerified=true')).toBe(2);
      expect(await total('answerVerified=false')).toBe(1);
      expect(await total('variationAllowed=true')).toBe(1);
      expect(await total('year=2026')).toBe(1);
      expect(await total('topicLabel=Percentage')).toBe(3);
      expect(await total('cognitiveLevel=Recall')).toBe(1);
      expect(await total('difficultyLabel=Moderate')).toBe(2);
      expect(await total('verificationMethod=recomputed%20by%20program')).toBe(2);
      expect(await total('sourceName=Bank%20Y')).toBe(1);
      expect(await total('concept=%E0%A4%A8%E0%A4%A6%E0%A5%80')).toBe(1); // "नदी" is inside "नदी तंत्र"
      expect(await total('subtopic=%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%A4%E0%A4%BF')).toBe(2);
      expect(await total('unused=true')).toBe(6);
      expect(await total('unused=false')).toBe(0);
    });

    it('combines filters with a sort, and treats % and _ in a text filter literally', async () => {
      const res = await list('qaGrade=A&topicLabel=Percentage&sort=externalId&dir=desc');
      expect(res.body.items.map((x: { externalId: string }) => x.externalId)).toEqual(['B-004', 'B-001']);
      expect(await total('concept=%25')).toBe(0);
      expect(await total('externalId=_')).toBe(0);
    });

    it('lists the values of the filter drop-downs with counts', async () => {
      const res = await request(ctx.app).get('/api/admin/questions/facets').set(auth(admin));
      expect(res.status).toBe(200);
      expect(res.body.qaGrade).toEqual([{ value: 'A', count: 3 }, { value: 'C', count: 1 }]);
      expect(res.body.year.map((y: { value: number }) => y.value)).toEqual([2024, 2026]);
      expect(res.body.topicLabel.find((t: { value: string }) => t.value === 'Percentage').count).toBe(3);
    });

    it('needs the questions:read permission', async () => {
      expect((await request(ctx.app).get('/api/admin/questions/facets')).status).toBe(401);
    });
  });
});
