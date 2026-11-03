// End-to-end drive of the DADU web export with Playwright (Chromium).
// Usage: npx expo export --platform web --output-dir /tmp/dadu-web && node tools/dadu/e2e-web.js /tmp/dadu-web [A2|A5]
// Pins the clock to 10:30 local time so the bedtime guard does not block the drive; screenshots land in ./e2e-shots.
const path = require('path');
const http = require('http');
const fs = require('fs');
const dir = process.argv[2]; const BAND = process.argv[3] || 'A2'; const SHOT_PREFIX = BAND === 'A2' ? '' : BAND + '-';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(dir, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
  res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(8099, r));
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 400, height: 860 } });
  // pin the clock to 10:30 IST so the bedtime guard does not block the drive
  await page.addInitScript(() => { const fixed = new Date('2026-11-03T10:30:00Z').getTime(); const start = Date.now(); const RealDate = Date; class D extends RealDate { constructor(...a) { if (a.length === 0) super(fixed + (RealDate.now() - start)); else super(...a); } static now() { return fixed + (RealDate.now() - start); } } globalThis.Date = D; });
  const errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  const shots = path.join(__dirname, 'e2e-shots'); fs.mkdirSync(shots, { recursive: true });
  const shot = (n) => page.screenshot({ path: path.join(shots, SHOT_PREFIX + n + '.png') });
  const tap = async (id, t = 8000) => { const vis = page.locator(`[data-testid="${id}"]:visible`); await (await vis.count() ? vis : page.getByTestId(id)).first().click({ timeout: t, force: true }); };
  // SVG groups report no box to Playwright's visibility check: click their centre with the mouse instead.
  const tapSvg = async (id) => { const ok = await page.evaluate((id) => { const el = document.querySelector(`[data-testid="${id}"]`); if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }, id); if (!ok) throw new Error('no svg element ' + id); };
  const log = (...a) => console.log('[e2e]', ...a);
  await page.goto('http://localhost:8099/'); await page.waitForTimeout(4000); await shot('01-language');
  try {
    await tap('lang-en'); await page.waitForTimeout(800); await shot('02-parent-setup');
    await page.getByTestId('consent-switch').first().click({ force: true });
    for (const k of ['1', '2', '3', '4']) await tap('key-' + k);
    await tap('parent-next'); await page.waitForTimeout(300);
    for (const k of ['1', '2', '3', '4']) await tap('key-' + k);
    await tap('parent-next'); await page.waitForTimeout(800); await shot('03-child-profile');
    await tap('band-' + BAND); await tap('child-save'); await page.waitForTimeout(2500); await shot('04-world');
    log('onboarding ok');
    await tap('tab-learn'); await page.waitForTimeout(1200); await shot('05-learn');
    await tap('tab-world'); await page.waitForTimeout(1200);
    await tap('place-villa.exterior'); await page.waitForTimeout(2000); await shot('06-villa');
    await page.getByText('Living room', { exact: true }).first().click({ force: true, timeout: 8000 }); await page.waitForTimeout(2000);
    await shot('07-living');
    await tapSvg('obj-villa.living.telescope'); await page.waitForTimeout(2500); await shot('08-lesson');
    log('lesson opened:', await page.getByTestId('lesson-next').count());
    for (let i = 0; i < 14; i++) { const n = page.getByTestId('lesson-next').first(); if (await n.count() && await n.isEnabled()) { await n.click({ force: true }); await page.waitForTimeout(400); } else { const ok = page.getByTestId(/^choice-|^quiz-/).first(); if (await ok.count()) { await ok.click({ force: true }); await page.waitForTimeout(400); } else break; } }
    await shot('09-lesson-later');
    const rep = page.getByTestId('echo-repeat').first(); if (await rep.count()) { await rep.click({ force: true }); await page.waitForTimeout(600); }
    const fin = page.getByTestId('lesson-next').first(); if (await fin.count()) { await fin.click({ force: true }); await page.waitForTimeout(1500); }
    await shot('09b-lesson-done');
    const done = page.getByText(/Real-world adventure|असली दुनिया/).first(); log('lesson reached completion card:', await done.count());
    const starText = await page.locator('text=/★ ?[0-9]+/').first().textContent().catch(() => null); log('stars shown:', starText);
    const back = page.getByTestId('lesson-back').first(); if (await back.count()) await back.click({ force: true }); await page.waitForTimeout(800);
    await shot('09c-after-lesson');
    await tap('back-to-world', 6000); await page.waitForTimeout(1200);
    await shot('09d-world-after');
    await tap('tab-stories', 4000); await page.waitForTimeout(1200); await shot('10-stories');
    const read = page.getByText(/^Read$|^पढ़ो$/).first(); if (await read.count()) { await read.click({ force: true }); await page.waitForTimeout(1500); await shot('10b-story'); for (let i = 0; i < 8; i++) { const n = page.getByTestId('story-next').first(); if (await n.count()) { await n.click({ force: true }); await page.waitForTimeout(300); } } await shot('10c-story-end'); }
    const qa = page.getByTestId(/^quiz-/).first(); if (await qa.count()) { await qa.click({ force: true }); await page.waitForTimeout(500); const sn = page.getByTestId('story-next').first(); if (await sn.count()) { await sn.click({ force: true }); await page.waitForTimeout(1200); } }
    await shot('10d-story-done');
    const sb = page.locator('[data-testid="story-back"]:visible, [data-testid="lesson-back"]:visible').first(); if (await sb.count()) { await sb.click({ force: true }); } else { const bk = page.getByText(/^Back$/).first(); if (await bk.count()) await bk.click({ force: true }); }
    await page.waitForTimeout(1000);
    const t = page.getByTestId('tab-tests'); log('tests tab count (0 in Little mode, 1 in Explorer):', await t.count());
    if (await t.count()) {
      await tap('tab-tests', 4000); await page.waitForTimeout(1200); await shot('11-tests');
      const st = page.getByTestId('test-start-daily').first(); if (await st.count()) { await st.click({ force: true }); await page.waitForTimeout(1000); await shot('11b-test-item');
        for (let i = 0; i < 12; i++) { const c = page.locator('[data-testid^="quiz-"]:visible').first(); if (await c.count()) { await c.click({ force: true }); await page.waitForTimeout(400); } const n = page.locator('[data-testid="test-next"]:visible').first(); if (await n.count() && await n.isEnabled()) { await n.click({ force: true }); await page.waitForTimeout(400); } }
        await shot('11c-test-result'); }
      await tap('tab-me', 4000); await page.waitForTimeout(1200); await shot('12-me');
    }
    await tap('tab-world', 4000); await page.waitForTimeout(800);
    // parent gate → dashboard
    await tap('parent-lock', 6000);
    await page.waitForTimeout(800); await shot('13-gate');
    const q = await page.locator('text=/What is (\\d+) times (\\d+)/').first().textContent().catch(() => null); log('gate question:', q);
    if (q) { const m = q.match(/(\d+) times (\d+)/); const ans = String(Number(m[1]) * Number(m[2])); for (const ch of ans) await tap('key-' + ch); await page.waitForTimeout(400); for (const ch of '1234') await tap('key-' + ch); await page.waitForTimeout(1200); await shot('14-parent-dashboard'); }
  } catch (e) { log('step failed:', e.message.split('\n')[0]); await shot('99-failure'); }
  log('errors:', errs.slice(0, 10));
  await b.close(); server.close();
})();
