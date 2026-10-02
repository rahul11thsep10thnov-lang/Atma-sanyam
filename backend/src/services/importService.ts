import type { Db } from '../database/client.js';
import { audit } from '../lib/audit.js';
import { unprocessable } from '../lib/httpError.js';
import { LANGUAGE_MAP, LANGUAGES } from '../lib/languages.js';
import type { ValidationIssue } from '../database/schema.js';
import { evaluate, insertQuestion, loadDuplicatePool } from './questionService.js';
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

  const pools = new Map<string, { id: string; normalizedText: string }[]>();
  const report: ImportReport = { dryRun: opts.dryRun, total: rows.length, imported: 0, needsReview: 0, failed: 0, rows: [] };

  for (const [i, r] of rows.entries()) {
    const rowNo = format === 'csv' ? i + 2 : i + 1; // CSV row 1 is the header
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
      failed: report.failed,
    });
  }
  return report;
}
