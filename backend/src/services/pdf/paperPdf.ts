// Draws a mock test as an A4 PDF on the server: the question paper, the
// answer key with solutions, or both. Same layout and wording as the
// console's print view, but made without a browser so the file can be stored
// and downloaded again.
//
// Text is set in Hind (Latin + Devanagari, shaped by fontkit so conjuncts and
// matras come out right). Characters Hind lacks (→ ⇒ ⅓ ∝ superscripts …) fall
// back to two small Noto subsets. Figures are the engine's SVGs, drawn as
// vectors.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { paperText, type PaperText } from './paperText.js';

export type PdfVariant = 'paper' | 'key' | 'both';

export interface PaperQuestion {
  position: number;
  subjectName: string;
  chapterName: string;
  questionText: string;
  figureSvg: string | null;
  difficulty: string;
  correctOption: string;
  explanation: string | null;
  options: { label: string; text: string; svg: string | null }[];
}

export interface PaperTest {
  title: string;
  description: string | null;
  examName: string;
  language: string;
  languageName: string;
  durationMinutes: number;
  marksPerQuestion: number;
  negativeMarks: number;
  questions: PaperQuestion[];
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

const FONT_DIR = new URL('../../../assets/fonts/', import.meta.url);
const FONT_FILES = {
  R: 'Hind-Regular.ttf',
  B: 'Hind-SemiBold.ttf',
  X: 'NotoSans-Extra.ttf',
  M: 'NotoSansMath-Symbols.ttf',
} as const;
type FontName = keyof typeof FONT_FILES;

interface LoadedFonts {
  bytes: Record<FontName, Buffer>;
  hasGlyph: Record<FontName, (cp: number) => boolean>;
}

let fonts: LoadedFonts | null = null;
function loadFonts(): LoadedFonts {
  if (fonts) return fonts;
  const bytes = {} as Record<FontName, Buffer>;
  const hasGlyph = {} as Record<FontName, (cp: number) => boolean>;
  for (const [name, file] of Object.entries(FONT_FILES) as [FontName, string][]) {
    const buf = readFileSync(fileURLToPath(new URL(file, FONT_DIR)));
    const font = fontkit.create(buf) as fontkit.Font;
    bytes[name] = buf;
    hasGlyph[name] = (cp) => font.hasGlyphForCodePoint(cp);
  }
  fonts = { bytes, hasGlyph };
  return fonts;
}

/** Marks and joiners stay in the font of the letter they belong to. */
const STICKY = /[\p{M}\u200c\u200d]/u;

/** Split text into runs, each set in the first font that has its glyphs. */
function fontRuns(text: string, primary: 'R' | 'B'): { font: FontName; text: string }[] {
  const { hasGlyph } = loadFonts();
  const runs: { font: FontName; text: string }[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    let font: FontName;
    const last = runs[runs.length - 1];
    if (last && STICKY.test(ch)) font = last.font;
    else if (/\s/.test(ch) || hasGlyph[primary](cp)) font = primary;
    else if (hasGlyph.X(cp)) font = 'X';
    else if (hasGlyph.M(cp)) font = 'M';
    else font = primary;
    if (last && last.font === font) last.text += ch;
    else runs.push({ font, text: ch });
  }
  return runs;
}

/** Remove control characters other than line breaks. */
function clean(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ');
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = { top: 44, bottom: 52, left: 40, right: 40 };
const W = PAGE_W - M.left - M.right;
const BOTTOM = PAGE_H - M.bottom;
const INDENT = 24;
const INK = '#111111';
const GREY = '#444444';
const LIGHT = '#666666';
const BRAND = '#c2410c';

interface TextOpts {
  size: number;
  bold?: boolean;
  color?: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  lineGap?: number;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(+n.toFixed(2));
}

function viewBoxOf(svg: string): { w: number; h: number } {
  const m = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svg);
  const w = m ? Number(m[1]) : 120;
  const h = m ? Number(m[2]) : 120;
  return w > 0 && h > 0 ? { w, h } : { w: 120, h: 120 };
}

/** Size of a figure scaled to fit inside maxW × maxH. */
function fitFigure(svg: string, maxW: number, maxH: number): { w: number; h: number } {
  const vb = viewBoxOf(svg);
  const k = Math.min(maxW / vb.w, maxH / vb.h);
  return { w: vb.w * k, h: vb.h * k };
}

class Writer {
  readonly doc: PDFKit.PDFDocument;
  y = M.top;

  constructor(doc: PDFKit.PDFDocument) {
    this.doc = doc;
  }

  height(text: string, o: TextOpts): number {
    if (!text) return 0;
    return this.doc
      .font(o.bold ? 'B' : 'R')
      .fontSize(o.size)
      .heightOfString(clean(text), { width: o.width, lineGap: o.lineGap ?? 1.5, align: o.align });
  }

  width(text: string, size: number, bold = false): number {
    return this.doc.font(bold ? 'B' : 'R').fontSize(size).widthOfString(text);
  }

  /** Writes text at (x, y) and returns the y below it. */
  text(text: string, x: number, y: number, o: TextOpts): number {
    const s = clean(text);
    if (!s) return y;
    const runs = fontRuns(s, o.bold ? 'B' : 'R');
    const opts = { width: o.width, lineGap: o.lineGap ?? 1.5, align: o.align ?? 'left' };
    this.doc.fillColor(o.color ?? INK).fontSize(o.size);
    runs.forEach((r, i) => {
      this.doc.font(r.font);
      const continued = i < runs.length - 1;
      if (i === 0) this.doc.text(r.text, x, y, { ...opts, continued });
      else this.doc.text(r.text, { ...opts, continued });
    });
    return this.doc.y;
  }

  /** Starts a new page when `h` points do not fit below the cursor. */
  ensure(h: number): void {
    if (this.y + h > BOTTOM && h < BOTTOM - M.top) this.newPage();
  }

  newPage(): void {
    this.doc.addPage();
    this.y = M.top;
  }

  figure(svg: string, x: number, y: number, w: number, h: number): void {
    SVGtoPDF(this.doc, svg, x, y, {
      width: w,
      height: h,
      preserveAspectRatio: 'xMidYMid meet',
      fontCallback: () => 'B',
      warningCallback: () => undefined,
    });
  }

  rule(y: number, width = 1, color = INK, dash?: number): void {
    const d = this.doc.save().lineWidth(width).strokeColor(color);
    if (dash) d.dash(dash, { space: dash });
    d.moveTo(M.left, y).lineTo(M.left + W, y).stroke();
    d.restore();
  }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function header(w: Writer, t: PaperTest, subtitle: string, staff: string | null): void {
  const doc = w.doc;
  const a = w.width('Police', 11, true);
  const b = w.width('Exams', 11, true);
  let x = M.left + (W - a - b) / 2;
  doc.font('B').fontSize(11).fillColor(INK).text('Police', x, w.y, { lineBreak: false });
  x += a;
  doc.fillColor(BRAND).text('Exams', x, w.y, { lineBreak: false });
  w.y += 16;
  w.y = w.text(t.title, M.left, w.y, { size: 16, bold: true, width: W, align: 'center', lineGap: 0 }) + 1;
  w.y = w.text(subtitle, M.left, w.y, { size: 9.5, color: GREY, width: W, align: 'center' });
  if (t.description) w.y = w.text(t.description, M.left, w.y, { size: 9, color: GREY, width: W, align: 'center' });
  if (staff) {
    const sw = w.width(staff, 8.5, true) + 16;
    const sx = M.left + (W - sw) / 2;
    w.y += 4;
    doc.save().lineWidth(0.8).strokeColor(INK).rect(sx, w.y, sw, 15).stroke().restore();
    w.text(staff, sx, w.y + 3, { size: 8.5, bold: true, width: sw, align: 'center', lineGap: 0 });
    w.y += 17;
  }
  w.y += 5;
  w.rule(w.y, 1.6);
  w.y += 10;
}

function metaTable(w: Writer, t: PaperTest, tx: PaperText, count: number, maxMarks: number): void {
  const doc = w.doc;
  const cols = [92, W / 2 - 92, 92, W / 2 - 92];
  const rows: [string, string, string, string][] = [
    [tx.time, `${t.durationMinutes} ${tx.minutes}`, tx.maxMarks, fmt(maxMarks)],
    [tx.questions, String(count), tx.marking, `${tx.correct(fmt(t.marksPerQuestion))}; ${tx.wrong(t.negativeMarks ? fmt(t.negativeMarks) : null)}`],
  ];
  for (const row of rows) {
    const h = Math.max(...row.map((c, i) => w.height(c, { size: 9.5, bold: i % 2 === 0, width: cols[i]! - 10 }))) + 8;
    let x = M.left;
    row.forEach((cell, i) => {
      const cw = cols[i]!;
      if (i % 2 === 0) doc.save().rect(x, w.y, cw, h).fill('#f1f1f1').restore();
      doc.save().lineWidth(0.8).strokeColor(INK).rect(x, w.y, cw, h).stroke().restore();
      w.text(cell, x + 5, w.y + 4, { size: 9.5, bold: i % 2 === 0, width: cw - 10 });
      x += cw;
    });
    w.y += h;
  }
  w.y += 12;
}

function candidateLine(w: Writer, tx: PaperText): void {
  const doc = w.doc;
  const gap = 14;
  const unit = (W - 2 * gap) / 4;
  const widths = [unit * 2, unit, unit];
  let x = M.left;
  [tx.name, tx.roll, tx.date].forEach((label, i) => {
    w.text(`${label}:`, x, w.y, { size: 9.5, width: widths[i]! });
    doc.save().lineWidth(0.8).strokeColor(INK).moveTo(x, w.y + 24).lineTo(x + widths[i]!, w.y + 24).stroke().restore();
    x += widths[i]! + gap;
  });
  w.y += 34;
}

function instructionsBox(w: Writer, tx: PaperText, count: number, maxMarks: number, sections: { name: string; n: number }[]): void {
  const doc = w.doc;
  const top = w.y;
  let y = top + 7;
  y = w.text(tx.instructionsTitle, M.left + 10, y, { size: 10, bold: true, width: W - 20 }) + 2;
  tx.instructions(count, fmt(maxMarks)).forEach((line, i) => {
    w.text(`${i + 1}.`, M.left + 12, y, { size: 9.5, width: 14 });
    y = w.text(line, M.left + 28, y, { size: 9.5, width: W - 38 });
  });
  if (sections.length > 1) {
    const line = sections.map((s, i) => `${tx.section} ${String.fromCharCode(65 + i)}: ${s.name} (${s.n})`).join('     ');
    y = w.text(line, M.left + 10, y + 4, { size: 9, bold: true, width: W - 20 });
  }
  y += 7;
  doc.save().lineWidth(0.8).strokeColor(INK).rect(M.left, top, W, y - top).stroke().restore();
  w.y = y + 12;
}

/** Section heading, kept on the same page as the section's first question. */
function sectionBand(w: Writer, label: string, firstQuestionHeight: number): void {
  const h = w.height(label, { size: 10.5, bold: true, width: W - 16 }) + 6;
  w.ensure(h + 8 + firstQuestionHeight);
  w.doc.save().rect(M.left, w.y, W, h).fill(INK).restore();
  w.text(label, M.left + 8, w.y + 3, { size: 10.5, bold: true, color: '#ffffff', width: W - 16 });
  w.y += h + 8;
}

const Q_SIZE = 10.5;
const OPT_SIZE = 10;
const LABEL_W = 22;
const OPT_FIG = 66;

type OptionLayout = 'figs' | 'short' | 'long';

function optionLayout(q: PaperQuestion): OptionLayout {
  if (q.options.some((o) => o.svg)) return 'figs';
  return q.options.every((o) => o.text.length <= 26) ? 'short' : 'long';
}

function questionFigureSize(q: PaperQuestion): { w: number; h: number } | null {
  return q.figureSvg ? fitFigure(q.figureSvg, Math.min(390, W - INDENT), 150) : null;
}

function optionsHeight(w: Writer, q: PaperQuestion, layout: OptionLayout): number {
  const inner = W - INDENT;
  if (layout === 'figs') return OPT_FIG + 4;
  if (layout === 'short') {
    const colW = (inner - 18) / 2 - LABEL_W;
    let h = 0;
    for (let i = 0; i < q.options.length; i += 2) {
      h += Math.max(...q.options.slice(i, i + 2).map((o) => w.height(o.text, { size: OPT_SIZE, width: colW }))) + 2;
    }
    return h;
  }
  return q.options.reduce((h, o) => h + w.height(o.text, { size: OPT_SIZE, width: inner - LABEL_W }) + 2, 0);
}

function drawOptions(w: Writer, q: PaperQuestion, layout: OptionLayout, top: number): number {
  const x0 = M.left + INDENT;
  const inner = W - INDENT;
  if (layout === 'figs') {
    const colW = inner / 4;
    q.options.forEach((o, i) => {
      const x = x0 + i * colW;
      w.text(`(${o.label})`, x, top + OPT_FIG / 2 - 7, { size: OPT_SIZE, bold: true, width: LABEL_W + 4 });
      if (o.svg) w.figure(o.svg, x + LABEL_W + 4, top, OPT_FIG, OPT_FIG);
      else w.text(o.text, x + LABEL_W + 4, top + OPT_FIG / 2 - 7, { size: OPT_SIZE, width: colW - LABEL_W - 8 });
    });
    return top + OPT_FIG + 4;
  }
  let y = top;
  if (layout === 'short') {
    const colW = (inner - 18) / 2;
    for (let i = 0; i < q.options.length; i += 2) {
      let rowBottom = y;
      q.options.slice(i, i + 2).forEach((o, j) => {
        const x = x0 + j * (colW + 18);
        w.text(`(${o.label})`, x, y, { size: OPT_SIZE, bold: true, width: LABEL_W });
        rowBottom = Math.max(rowBottom, w.text(o.text, x + LABEL_W, y, { size: OPT_SIZE, width: colW - LABEL_W }));
      });
      y = rowBottom + 2;
    }
    return y;
  }
  for (const o of q.options) {
    w.text(`(${o.label})`, x0, y, { size: OPT_SIZE, bold: true, width: LABEL_W });
    y = w.text(o.text, x0 + LABEL_W, y, { size: OPT_SIZE, width: inner - LABEL_W }) + 2;
  }
  return y;
}

function questionHeight(w: Writer, q: PaperQuestion): number {
  const fig = questionFigureSize(q);
  const textH = w.height(q.questionText, { size: Q_SIZE, width: W - INDENT });
  return textH + (fig ? fig.h + 10 : 0) + 4 + optionsHeight(w, q, optionLayout(q)) + 12;
}

function question(w: Writer, q: PaperQuestion): void {
  const layout = optionLayout(q);
  const fig = questionFigureSize(q);
  w.ensure(questionHeight(w, q));
  w.text(`${q.position}.`, M.left, w.y, { size: Q_SIZE, bold: true, width: INDENT });
  let y = w.text(q.questionText, M.left + INDENT, w.y, { size: Q_SIZE, width: W - INDENT });
  if (q.figureSvg && fig) {
    w.figure(q.figureSvg, M.left + INDENT, y + 5, fig.w, fig.h);
    y += fig.h + 10;
  }
  y = drawOptions(w, q, layout, y + 4);
  w.y = y + 12;
}

function answerGrid(w: Writer, qs: PaperQuestion[]): void {
  const doc = w.doc;
  const perRow = 10;
  const cw = W / perRow;
  const ch = 17;
  for (let i = 0; i < qs.length; i += perRow) {
    w.ensure(ch);
    qs.slice(i, i + perRow).forEach((q, j) => {
      const x = M.left + j * cw;
      doc.save().lineWidth(0.5).strokeColor('#bbbbbb').rect(x, w.y, cw, ch).stroke().restore();
      w.text(String(q.position), x + 5, w.y + 3.5, { size: 9, bold: true, width: 22, lineGap: 0 });
      w.text(q.correctOption, x + 28, w.y + 3.5, { size: 9.5, width: cw - 30, lineGap: 0 });
    });
    w.y += ch;
  }
  w.y += 14;
}

function solution(w: Writer, q: PaperQuestion, tx: PaperText, showDetails: boolean): void {
  const right = q.options.find((o) => o.label === q.correctOption);
  const ansLabel = `${tx.ans}: (${q.correctOption})`;
  const ansLabelW = w.width(ansLabel, 9.5, true) + 6;
  const textW = W - INDENT;
  const ansText = right && !right.svg ? right.text : '';
  const thumb = right?.svg ? 44 : 0;
  const tags = `${q.subjectName} · ${q.chapterName} · ${q.difficulty}`;
  const total =
    w.height(q.questionText, { size: 9.5, width: textW }) +
    Math.max(thumb, w.height(ansText || ' ', { size: 9.5, width: textW - ansLabelW })) +
    (q.explanation ? w.height(q.explanation, { size: 9, width: textW }) + 2 : 0) +
    (showDetails ? 12 : 0) +
    16;
  w.ensure(total);
  w.text(`${q.position}.`, M.left, w.y, { size: 9.5, bold: true, width: INDENT });
  let y = w.text(q.questionText, M.left + INDENT, w.y, { size: 9.5, width: textW }) + 2;
  w.text(ansLabel, M.left + INDENT, y + (thumb ? thumb / 2 - 6 : 0), { size: 9.5, bold: true, width: ansLabelW });
  if (right?.svg) {
    w.figure(right.svg, M.left + INDENT + ansLabelW, y, thumb, thumb);
    y += thumb + 2;
  } else {
    y = w.text(ansText, M.left + INDENT + ansLabelW, y, { size: 9.5, width: textW - ansLabelW });
  }
  if (q.explanation) y = w.text(q.explanation, M.left + INDENT, y + 1, { size: 9, color: '#333333', width: textW });
  if (showDetails) y = w.text(tags, M.left + INDENT, y + 1, { size: 7.5, color: LIGHT, width: textW });
  y += 5;
  w.rule(y, 0.5, '#bbbbbb', 2);
  w.y = y + 8;
}

function footers(doc: PDFKit.PDFDocument, t: PaperTest, tx: PaperText): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const keepBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = PAGE_H - 32;
    doc.save().lineWidth(0.4).strokeColor('#bbbbbb').moveTo(M.left, y - 5).lineTo(M.left + W, y - 5).stroke().restore();
    const pageLabel = tx.page(i + 1, range.count);
    const runs = fontRuns(clean(`PoliceExams · ${t.title}`), 'R');
    doc.fillColor(LIGHT).fontSize(7.5);
    runs.forEach((r, k) => {
      doc.font(r.font);
      const opts = { width: W - 90, height: 10, ellipsis: true, lineBreak: false, continued: k < runs.length - 1 };
      if (k === 0) doc.text(r.text, M.left, y, opts);
      else doc.text(r.text, opts);
    });
    doc.font('R').fontSize(7.5).fillColor(LIGHT).text(pageLabel, M.left + W - 90, y, { width: 90, align: 'right', lineBreak: false });
    doc.page.margins.bottom = keepBottom;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface RenderOptions {
  variant: PdfVariant;
  showDetails: boolean;
}

export async function renderPaperPdf(t: PaperTest, opts: RenderOptions): Promise<{ data: Buffer; pages: number }> {
  const { bytes } = loadFonts();
  const tx = paperText(t.language);
  const doc = new PDFDocument({
    size: 'A4',
    margins: M,
    bufferPages: true,
    info: {
      Title: `${t.title} — ${opts.variant === 'key' ? tx.key : tx.paper}`,
      Author: 'PoliceExams',
      Subject: `${t.examName} · ${t.languageName}`,
      Creator: 'PoliceExams API',
    },
    lang: t.language === 'hi' ? 'hi-IN' : 'en-IN',
  });
  for (const name of Object.keys(FONT_FILES) as FontName[]) doc.registerFont(name, bytes[name]);
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const w = new Writer(doc);
  const count = t.questions.length;
  const maxMarks = count * t.marksPerQuestion;
  const sections: { name: string; items: PaperQuestion[] }[] = [];
  for (const q of t.questions) {
    const last = sections[sections.length - 1];
    if (last && last.name === q.subjectName) last.items.push(q);
    else sections.push({ name: q.subjectName, items: [q] });
  }

  const showPaper = opts.variant !== 'key';
  const showKey = opts.variant !== 'paper';

  if (showPaper) {
    header(w, t, `${t.examName} · ${t.languageName} · ${tx.paper}`, null);
    metaTable(w, t, tx, count, maxMarks);
    candidateLine(w, tx);
    instructionsBox(w, tx, count, maxMarks, sections.map((s) => ({ name: s.name, n: s.items.length })));
    sections.forEach((s, si) => {
      if (sections.length > 1) sectionBand(w, `${tx.section} ${String.fromCharCode(65 + si)} — ${s.name}`, questionHeight(w, s.items[0]!));
      for (const q of s.items) question(w, q);
    });
    w.ensure(20);
    w.text(tx.endOfPaper, M.left, w.y + 4, { size: 9, color: '#555555', width: W, align: 'center' });
  }

  if (showKey) {
    if (showPaper) w.newPage();
    header(w, t, `${tx.key} · ${t.examName}`, tx.staffCopy);
    answerGrid(w, t.questions);
    w.ensure(40);
    w.y = w.text(tx.solutions, M.left, w.y, { size: 12.5, bold: true, width: W }) + 6;
    for (const q of t.questions) solution(w, q, tx, opts.showDetails);
  }

  footers(doc, t, tx);
  const pages = doc.bufferedPageRange().count;
  doc.end();
  return { data: await done, pages };
}
