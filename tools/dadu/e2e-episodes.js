// End-to-end drive of the DADU web export with Playwright (Chromium).
// Usage: npx expo export --platform web --output-dir /tmp/dadu-web && node tools/dadu/e2e-episodes.js /tmp/dadu-web  (walks the new home, Watch, Stories, Play and Game screens)
// Pins the clock to 10:30 local time so the bedtime guard does not block the drive; screenshots land in ./e2e-shots.
const { chromium } = require('playwright');
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
  const page = await b.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
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
    await page.waitForTimeout(1500); await shot('h1-home');
    await tap('home-watch'); await page.waitForTimeout(1800); await shot('h2-watch');
    await page.locator('[data-testid^="watch-"]').first().click({ force: true }); await page.waitForTimeout(2500); await shot('h3-lesson-1');
    await page.waitForTimeout(5000); await shot('h4-lesson-auto');
    for (let i = 0; i < 6; i++) { try { await tap('lesson-next', 2500); } catch (e) { break; } await page.waitForTimeout(900); }
    await shot('h5-lesson-later');
    await page.goto('http://localhost:8099/'); await page.waitForTimeout(2500);
    await tap('home-stories'); await page.waitForTimeout(1800); await shot('h6-stories');
    await page.locator('[data-testid^="story-"]').first().click({ force: true }); await page.waitForTimeout(3000); await shot('h7-story');
    await page.waitForTimeout(4000); await shot('h8-story-later');
    await page.goto('http://localhost:8099/'); await page.waitForTimeout(2500);
    await tap('home-play'); await page.waitForTimeout(1800); await shot('h9-play');
    await page.locator('[data-testid^="game-"]').first().click({ force: true }); await page.waitForTimeout(2500); await shot('h10-game');
  } catch (e) { console.log('ERR', e.message.slice(0,300)); }
  log('errors:', JSON.stringify(errs.slice(0,5)));
  await b.close(); server.close();
})();
