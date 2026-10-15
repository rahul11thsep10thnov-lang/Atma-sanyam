// Two-session browser test: a guardian watches a child's game live while the
// child browses facts, crafts and plays a quiz.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? new URL('./out/', import.meta.url).pathname;
const PHONE = '+919876' + String(Math.floor(Math.random() * 900000) + 100000);
const lastCode = () => { const m = [...readFileSync(process.env.E2E_API_LOG ?? '/tmp/loji-api.log', 'utf8').matchAll(/\b(\d{6}) is (?:your|the) LoJi/g)]; return m.length ? m[m.length - 1][1] : null; };
mkdirSync(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch({ args: ['--no-proxy-server'], headless: true });
const mk = async (name) => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} console: ${m.text().slice(0, 300)}`); });
  return page;
};
const g = await mk('guardian');
const p = await mk('player');
const shot = (page, n) => page.screenshot({ path: `${OUT}/${n}.png` });
const wait = (page, ms) => page.waitForTimeout(ms);
try {
  await g.goto((process.env.E2E_WEB_URL ?? 'http://localhost:8099/'), { waitUntil: 'networkidle' });
  await wait(g, 1200);
  await g.getByText("I'm a grown-up").first().click();
  await wait(g, 600);
  await g.getByText('New here? Create a family account').click();
  await wait(g, 500);
  await g.getByLabel('Your name').fill('Asha');
  await g.getByLabel('Mobile number').fill(PHONE);
  await g.getByLabel('Password').first().fill('Guard-pass1');
  await g.getByLabel('Confirm password').fill('Guard-pass1');
  await g.getByRole('switch').first().click();
  await g.getByText('Send my code').click();
  await wait(g, 1500);
  await g.keyboard.type(lastCode());
  await wait(g, 2500);
  await g.getByText('Plan').last().click();
  await wait(g, 1000);
  await g.getByText('Activate test subscription').click();
  await wait(g, 1500);
  await g.getByText('Children').last().click();
  await wait(g, 800);
  await g.getByRole('button', { name: 'Add a child' }).last().click({ force: true });
  await wait(g, 800);
  await g.getByLabel('Nickname').fill('Kiran');
  await g.getByText('2017').click();
  await g.getByLabel('Secret PIN (4–6 digits)').fill('2580');
  await g.getByRole('button', { name: 'Save' }).last().click({ force: true });
  await wait(g, 1500);
  const playerId = (await g.locator('text=/LOJI-[A-Z0-9]{6}/').first().innerText()).trim();
  console.log('playerId', playerId);
  await g.getByRole('button', { name: 'Done' }).last().click({ force: true });
  await wait(g, 800);
  await g.getByRole('button', { name: 'Kiran' }).first().click({ force: true });
  await wait(g, 1200);
  await shot(g, '20-g-child-detail');

  // ---- player on a second device ----
  await p.goto((process.env.E2E_WEB_URL ?? 'http://localhost:8099/'), { waitUntil: 'networkidle' });
  await wait(p, 1200);
  await p.getByText("I'm a player").first().click();
  await wait(p, 600);
  await p.getByLabel('Player ID').fill(playerId);
  await p.getByLabel('Secret PIN').fill('2580');
  await shot(p, '21-p-login');
  await p.getByRole('button', { name: "Let's play!" }).click({ force: true });
  await wait(p, 2500);
  if (await p.getByText('Verify').count()) { await p.keyboard.type(lastCode()); await wait(p, 2500); }
  await shot(p, '22-p-home');
  await p.getByText('Did You Know?').last().click();
  await wait(p, 1800);
  await shot(p, '23-p-facts');
  await p.getByText("Today's discovery").first().click({ force: true });
  await wait(p, 1500);
  await shot(p, '24-p-fact-detail');
  const quizBtn = p.getByText('Quick quiz');
  if (await quizBtn.count()) { await quizBtn.first().click({ force: true }); await wait(p, 800); await shot(p, '25-p-quiz'); }
  await p.getByRole('button', { name: 'Back' }).first().click({ force: true });
  await wait(p, 1000);
  await p.getByText('Art & Craft').last().click({ force: true });
  await wait(p, 1500);
  await shot(p, '26-p-crafts');
  await p.getByRole('button', { name: /Paper Boat/ }).first().click({ force: true });
  await wait(p, 1500);
  await shot(p, '27-p-craft-detail');
  await p.getByRole('button', { name: 'Start making' }).click({ force: true });
  await wait(p, 1800);
  await shot(p, '28-p-craft-step');
  // ---- game + live mirror ----
  await p.getByRole('button', { name: 'Back' }).first().click({ force: true });
  await wait(p, 800);
  await p.getByRole('button', { name: 'Back' }).first().click({ force: true });
  await wait(p, 1000);
  await p.getByText('Games').last().click({ force: true });
  await wait(p, 1200);
  await p.getByRole('button', { name: 'Science Quiz' }).first().click({ force: true });
  await wait(p, 1200);
  await p.getByRole('button', { name: /^Play ·/ }).click({ force: true });
  await wait(p, 2500);
  await shot(p, '29-p-science-quiz');
  await g.getByRole('button', { name: 'Watch live' }).first().click({ force: true });
  await wait(g, 3000);
  await shot(g, '30-g-mirror');
  const liveText = await g.textContent('body');
  console.log('guardian sees watching:', liveText.includes('You are watching live'), 'hud:', /\d+ ✓/.test(liveText));
  // player answers one question; guardian frame updates
  await p.getByRole('button').filter({ hasText: /^[A-D]/ }).nth(0).click({ force: true }).catch(() => undefined);
  const optionButtons = p.locator('[role="button"]').filter({ has: p.locator('text=/^[A-D]$/') });
  if (await optionButtons.count()) await optionButtons.first().click({ force: true });
  await wait(p, 1500);
  await shot(p, '31-p-answered');
  await wait(g, 1500);
  await shot(g, '32-g-mirror-updated');
  // guardian pauses the game
  await g.getByRole('button', { name: 'Pause' }).first().click({ force: true });
  await wait(p, 2500);
  const pausedText = await p.textContent('body');
  console.log('player paused by guardian:', pausedText.includes('Your grown-up paused the game'));
  await shot(p, '33-p-paused');
  await shot(g, '34-g-paused');
  await g.getByRole('button', { name: 'Resume' }).first().click({ force: true });
  await wait(p, 2000);
  console.log('player resumed:', !(await p.textContent('body')).includes('Your grown-up paused the game'));
} catch (e) {
  console.log('FAILED', e.message.split('\n')[0]);
  await shot(g, '98-g-failure'); await shot(p, '99-p-failure');
}
console.log('errors', errors.filter((e) => !/404|facts\/daily/.test(e)).slice(0, 10));
await browser.close();
if (errors.length) process.exitCode = 1;
