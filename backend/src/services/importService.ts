import type { Db } from '../database/client.js';
import { audit } from '../lib/audit.js';
import { unprocessable } from '../lib/httpError.js';
import { LANGUAGE_MAP, LANGUAGES } from '../lib/languages.js';
import type { ValidationIssue } from '../database/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import { questions } from '../database/schema.js';
import { evaluate, insertQuestion, loadDuplicatePool, type BankMeta } from './questionService.js';
import { findScopeByNames, resolveScope } from './taxonomyService.js';

export const MAX_IMPORT_ROWS = 2000;

/** RFC 4180 CSV: quoted fields, "" escapes, commas/newlines inside quotes, BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

export interface ImportRow {
  exam: string;
  subject: string;
  chapter: string;
  topic?: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation?: string;
  difficulty: string;
  language: string;
  source_name?: string;
  source_reference?: string;
  valid_as_of?: string;
  // Optional bank columns, stored so the console can filter and sort on them.
  external_id?: string;
  topic_label?: string;
  subtopic?: string;
  concept?: string;
  cognitive_level?: string;
  year?: string;
  variation_allowed?: string;
  variation_rule?: string;
  difficulty_label?: string;
  answer_verified?: string;
  ai_verified?: string;
  verification_method?: string;
  qa_grade?: string;
  qa_flags?: string;
  qa_fixes?: string;
}

const BOOLEAN_COLUMNS = ['variation_allowed', 'answer_verified', 'ai_verified'] as const;

function parseBool(v: string): boolean | null | undefined {
  const t = v.trim().toLowerCase();
  if (t === '') return null;
  if (['true', 'yes', 'y', '1'].includes(t)) return true;
  if (['false', 'no', 'n', '0'].includes(t)) return false;
  return undefined;
}

/** Reads the optional bank columns; returns an error message for a bad value. */
export function bankMeta(r: Record<string, string>): { meta: BankMeta } | { error: string } {
  const text = (k: string) => r[k]?.trim() || null;
  const bools: Record<string, boolean | null> = {};
  for (const k of BOOLEAN_COLUMNS) {
    const b = parseBool(r[k] ?? '');
    if (b === undefined) return { error: `${k} must be true or false (got "${r[k]}").` };
    bools[k] = b;
  }
  let year: number | null = null;
  if (r.year?.trim()) {
    year = Number(r.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return { error: `year must be a 4-digit year (got "${r.year}").` };
  }
  const grade = text('qa_grade')?.toUpperCase() ?? null;
  return {
    meta: {
      externalId: text('external_id'),
      topicLabel: text('topic_label'),
      subtopic: text('subtopic'),
      concept: text('concept'),
      cognitiveLevel: text('cognitive_level'),
      year,
      variationAllowed: bools.variation_allowed!,
      variationRule: text('variation_rule'),
      difficultyLabel: text('difficulty_label'),
      answerVerified: bools.answer_verified!,
      aiVerified: bools.ai_verified!,
      verificationMethod: text('verification_method'),
      qaGrade: grade,
      qaFlags: text('qa_flags'),
      qaFixes: text('qa_fixes'),
    },
  };
}

const REQUIRED = ['exam', 'subject', 'chapter', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option', 'difficulty', 'language'] as const;

function normaliseKey(k: string) {
  return k.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function rowsFromCsv(content: string): Record<string, string>[] {
  const [header, ...body] = parseCsv(content);
  if (!header) throw unprocessable('The CSV file is empty.');
  const keys = header.map(normaliseKey);
  const missing = REQUIRED.filter((r) => !keys.includes(r));
  if (missing.length) throw unprocessable(`Missing CSV columns: ${missing.join(', ')}.`);
  return body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()])));
}

export function rowsFromJson(content: string): Record<string, string>[] {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (e) {
    throw unprocessable(`Invalid JSON: ${(e as Error).message}`);
  }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) throw unprocessable('JSON must be an array of questions or { "questions": [...] }.');
  return list.map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === 'options' && Array.isArray(v)) {
        // Accept { options: ["…", …] } or [{ id, text }] as well as option_a…d.
        v.forEach((opt, i) => {
          const text = typeof opt === 'string' ? opt : String((opt as { text?: unknown })?.text ?? '');
          out[`option_${'abcd'[i] ?? i}`] = text;
        });
      } else if (v !== null && v !== undefined) out[normaliseKey(k)] = String(v).trim();
    }
    if (!out.question && out.question_text) out.question = out.question_text;
    return out;
  });
}

/** Language column may be a code (hi, en, hi-Latn) or a name (Hindi, Hinglish). */
function languageCode(value: string): string | null {
  const v = value.trim().toLowerCase();
  const byCode = LANGUAGES.find((l) => l.code.toLowerCase() === v);
  if (byCode) return byCode.code;
  const byName = LANGUAGES.find((l) => l.name.toLowerCase() === v);
  return byName?.code ?? null;
}

export interface ImportReport {
  dryRun: boolean;
  total: number;
  imported: number;
  needsReview: number;
  /** Rows whose external_id is already in the bank (a re-run of the same file). */
  skipped: number;
  failed: number;
  rows: { row: number; ok: boolean; questionId?: string; status?: string; issues: ValidationIssue[] }[];
}

/**
 * Every row goes through the same validator and duplicate check as AI output.
 * Rows with errors are reported and skipped; the rest land in NEEDS_REVIEW so
 * a human approves them before they can be published.
 */
export async function importQuestions(
  db: Db,
  format: 'csv' | 'json',
  content: string,
  adminId: string,
  opts: { dryRun: boolean; source?: 'import' | 'pyq'; sourceMaterialId?: string | null }
): Promise<ImportReport> {
  const rows = format === 'csv' ? rowsFromCsv(content) : rowsFromJson(content);
  if (rows.length === 0) throw unprocessable('No questions found in the file.');
  if (rows.length > MAX_IMPORT_ROWS) throw unprocessable(`At most ${MAX_IMPORT_ROWS} questions per import (found ${rows.length}).`);
  return importRows(db, format, rows, adminId, opts);
}

/** The import itself, on rows that are already parsed (the CLI feeds it in chunks).
 * `rowOffset` keeps row numbers right when a file is imported in several chunks. */
export async function importRows(
  db: Db,
  format: 'csv' | 'json',
  rows: Record<string, string>[],
  adminId: string,
  opts: { dryRun: boolean; source?: 'import' | 'pyq'; sourceMaterialId?: string | null; rowOffset?: number }
): Promise<ImportReport> {
  const pools = new Map<string, { id: string; normalizedText: string }[]>();
  const report: ImportReport = { dryRun: opts.dryRun, total: rows.length, imported: 0, needsReview: 0, skipped: 0, failed: 0, rows: [] };
  const fileExternalIds = [...new Set(rows.map((x) => x.external_id?.trim()).filter((x): x is string => !!x))];
  const knownExternalIds = new Map<string, Set<string>>(); // exam id → external ids

  for (const [i, r] of rows.entries()) {
    const rowNo = (opts.rowOffset ?? 0) + (format === 'csv' ? i + 2 : i + 1); // CSV row 1 is the header
    const fail = (message: string, code = 'IMPORT_ROW_INVALID') => {
      report.failed++;
      report.rows.push({ row: rowNo, ok: false, issues: [{ code, severity: 'error', message }] });
    };
    const missing = REQUIRED.filter((k) => !r[k]?.trim());
    if (missing.length) {
      fail(`Missing value(s): ${missing.join(', ')}.`);
      continue;
    }
    const language = languageCode(r.language!);
    if (!language || !LANGUAGE_MAP.get(language)?.enabled) {
      fail(`Unsupported language "${r.language}".`);
      continue;
    }
    const ids = await findScopeByNames(db, { exam: r.exam!, subject: r.subject!, chapter: r.chapter!, topic: r.topic });
    if (!ids) {
      fail(`Unknown exam/subject/chapter${r.topic ? '/topic' : ''}: ${[r.exam, r.subject, r.chapter, r.topic].filter(Boolean).join(' › ')}.`, 'METADATA_MISSING');
      continue;
    }
    const bank = bankMeta(r);
    if ('error' in bank) {
      fail(bank.error);
      continue;
    }
    if (r.question_type && !/^mcq$/i.test(r.question_type.trim())) {
      fail(`question_type "${r.question_type}" is not supported (only MCQ).`);
      continue;
    }
    if (bank.meta.externalId) {
      // Re-importing the same file must not create the questions twice.
      if (!knownExternalIds.has(ids.examId)) {
        const found = await db
          .select({ externalId: questions.externalId })
          .from(questions)
          .where(and(eq(questions.examId, ids.examId), inArray(questions.externalId, fileExternalIds)));
        knownExternalIds.set(ids.examId, new Set(found.map((x) => x.externalId!)));
      }
      const seen = knownExternalIds.get(ids.examId)!;
      if (seen.has(bank.meta.externalId)) {
        report.skipped++;
        report.rows.push({ row: rowNo, ok: false, issues: [{ code: 'ALREADY_IMPORTED', severity: 'warning', message: `${bank.meta.externalId} is already in the bank.` }] });
        continue;
      }
      seen.add(bank.meta.externalId);
    }
    const scope = await resolveScope(db, ids);
    const poolKey = `${ids.examId}|${ids.subjectId}|${language}`;
    if (!pools.has(poolKey)) pools.set(poolKey, await loadDuplicatePool(db, { examId: ids.examId, subjectId: ids.subjectId, language }));
    const pool = pools.get(poolKey)!;

    const ev = evaluate(
      {
        question_text: r.question!,
        options: [r.option_a!, r.option_b!, r.option_c!, r.option_d!].map((text, k) => ({ id: 'ABCD'[k]!, text })),
        correct_option: r.correct_option!,
        explanation: r.explanation ?? '',
        difficulty: r.difficulty!,
        computation: r.computation?.trim() || null,
        language,
        question_type: 'mcq',
        examId: ids.examId,
        subjectId: ids.subjectId,
        chapterId: ids.chapterId,
        topicId: ids.topicId ?? null,
      },
      { explanationRequired: true, metadataOk: scope.ok, sourceProvided: !!r.source_reference, pool }
    );
    if (ev.validation.decision === 'rejected') {
      report.failed++;
      report.rows.push({ row: rowNo, ok: false, issues: ev.validation.issues });
      continue;
    }
    let questionId: string | undefined;
    if (!opts.dryRun) {
      const row = await insertQuestion(db, ev, {
        status: 'needs_review',
        source: opts.source ?? 'import',
        sourceName: r.source_name || null,
        sourceReference: r.source_reference || null,
        sourceMaterialId: opts.sourceMaterialId ?? null,
        validAsOf: /^\d{4}-\d{2}-\d{2}$/.test(r.valid_as_of ?? '') ? r.valid_as_of! : null,
        bank: bank.meta,
        createdBy: adminId,
      });
      questionId = row.id;
      pool.push({ id: row.id, normalizedText: ev.normalizedText });
    } else {
      pool.push({ id: `row-${rowNo}`, normalizedText: ev.normalizedText });
    }
    report.imported++;
    if (ev.validation.issues.length) report.needsReview++;
    report.rows.push({ row: rowNo, ok: true, questionId, status: 'needs_review', issues: ev.validation.issues });
  }

  if (!opts.dryRun) {
    await audit(db, adminId, 'questions.imported', 'import', null, {
      format,
      source: opts.source ?? 'import',
      total: report.total,
      imported: report.imported,
      skipped: report.skipped,
      failed: report.failed,
    });
  }
  return report;
}
