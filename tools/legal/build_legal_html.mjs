// Builds the public web page Google Play asks for (privacy policy URL and the
// account-deletion URL) from the very same text the app shows in
// Settings → Legal (src/legal/documents.ts).
//
//   LEGAL_EMAIL=support@your-domain.com node --experimental-strip-types tools/legal/build_legal_html.mjs
//
// LEGAL_MODE=offline (the default, for version 1: no accounts, nothing leaves
// the phone) or LEGAL_MODE=online (a build that uses the Tame API). Publish the
// set that matches the build on Google Play.
//
// Writes docs/legal/index.html. Host it anywhere that serves HTTPS (GitHub Pages,
// Netlify, your own domain). Use  <url>#privacy  as the privacy policy link and,
// for an online build,  <url>#deletion  as the account-deletion link.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { legalDocFor, legalOrderFor, LEGAL_PUBLISHER, LEGAL_UPDATED, fillLegal } from '../../src/legal/documents.ts';

const mode = (process.env.LEGAL_MODE || 'offline').toLowerCase();
if (mode !== 'offline' && mode !== 'online') throw new Error('LEGAL_MODE must be "offline" or "online"');
const online = mode === 'online';
const order = legalOrderFor(online);
const docOf = (id) => legalDocFor(id, online);

const email = process.env.LEGAL_EMAIL || '';
if (!email) console.warn('LEGAL_EMAIL is not set: the page will say "the support email listed on Tame’s Google Play page". Set it before publishing.');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fill = (s) => esc(fillLegal(s, email));

const sections = order.map((id) => {
  const d = docOf(id);
  return `<section id="${id}">
<h2>${esc(d.title)}</h2>
<p class="lead">${fill(d.intro)}</p>
${d.sections.map((s) => `<h3>${esc(s.heading)}</h3>\n${s.paragraphs.map((p) => `<p>${fill(p)}</p>`).join('\n')}`).join('\n')}
</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tame — Legal &amp; User Policies</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #FBF3E8; color: #2B2118; font: 16px/1.6 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 34px; margin: 0 0 4px; }
  h2 { font-size: 26px; margin: 48px 0 8px; padding-top: 16px; border-top: 1px solid #EADBC9; }
  h3 { font-size: 17px; margin: 24px 0 4px; color: #6B4A33; }
  p { margin: 8px 0; }
  .lead { color: #5E4A3A; }
  .meta { color: #8A6E5A; font-size: 14px; }
  nav { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 20px 0 0; }
  nav a { color: #C4573B; text-decoration: none; font-weight: 600; }
  nav a:hover { text-decoration: underline; }
</style>
</head>
<body>
<main>
<h1>Tame</h1>
<p class="meta">Tame your time · Legal &amp; User Policies · Published by ${esc(LEGAL_PUBLISHER)} · Updated ${esc(LEGAL_UPDATED)}</p>
<nav>${order.map((id) => `<a href="#${id}">${esc(docOf(id).title)}</a>`).join('')}</nav>
${sections}
</main>
</body>
</html>
`;
const out = fileURLToPath(new URL('../../docs/legal/index.html', import.meta.url));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log('wrote', out, `(${mode}, ${html.length} bytes)`);
