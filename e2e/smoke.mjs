// Browser smoke test of the LoJi web build against the local API.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? new URL('./out/', import.meta.url).pathname;
const PHONE = '+919876' + String(Math.floor(Math.random() * 900000) + 100000);
const lastCode = () => {
  const log = readFileSync(process.env.E2E_API_LOG ?? '/tmp/loji-api.log', 'utf8');
  const m = [...log.matchAll(/\b(\d{6}) is your LoJi/g)];
  return m.length ? m[m.length - 1][1] : null;
};
mkdirSync(OUT, { recursive: true });
const errors = [];
const browser = await chromium.launch({ args: ['--no-proxy-server'], headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
try {
  await page.goto((process.env.E2E_WEB_URL ?? 'http://localhost:8099/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot('01-welcome');
  await page.getByText("I'm a grown-up").first().click();
  await page.waitForTimeout(800);
  await shot('02-login');
  await page.getByText('New here? Create a family account').click();
  await page.waitForTimeout(600);
  await page.getByLabel('Your name').fill('Asha');
  await page.getByLabel('Mobile number').fill(PHONE);
  await page.getByLabel('Password').first().fill('Guard-pass1');
  await page.getByLabel('Confirm password').fill('Guard-pass1');
  await page.getByRole('switch').first().click();
  await shot('03-register');
  await page.getByText('Send my code').click();
  await page.waitForTimeout(1500);
  await shot('04-otp');
  const code = lastCode();
  console.log('code', code);
  await page.keyboard.type(code);
  await page.waitForTimeout(2500);
  await shot('05-dashboard');
  // subscribe via sandbox
  await page.getByText('Plan').last().click();
  await page.waitForTimeout(1200);
  await shot('06-plan');
  await page.getByText('Activate test subscription').click();
  await page.waitForTimeout(1500);
  await shot('07-plan-active');
  // add child
  await page.getByText('Children').last().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Add a child' }).last().click({ force: true });
  await page.waitForTimeout(800);
  await page.getByLabel('Nickname').fill('Kiran');
  await page.getByText('2019').click();
  await page.getByLabel('Secret PIN (4–6 digits)').fill('2580');
  await shot('08-child-editor');
  await page.getByRole('button', { name: 'Save' }).last().click({ force: true });
  await page.waitForTimeout(1500);
  await shot('09-child-created');
  const playerId = (await page.locator('text=/LOJI-[A-Z0-9]{6}/').first().innerText()).trim();
  console.log('playerId', playerId);
  await page.getByRole('button', { name: 'Done' }).last().click({ force: true });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Kiran' }).first().click({ force: true });
  await page.waitForTimeout(1200);
  await shot('10-child-detail');
  await page.getByRole('button', { name: 'Open the Player Console on this device' }).click({ force: true });
  await page.waitForTimeout(2500);
  await shot('11-player-home');
  await page.getByText('Games').last().click();
  await page.waitForTimeout(1200);
  await shot('12-games');
  await page.getByRole('button', { name: 'Picture Matching' }).first().click({ force: true });
  await page.waitForTimeout(1200);
  await shot('13-game-detail');
  await page.getByRole('button', { name: /^Play ·/ }).click({ force: true });
  await page.waitForTimeout(2000);
  await shot('14-game-play');
  // play: tap tiles by label pairs
  const tiles = page.getByRole('button').filter({ hasNot: page.locator('text=/.*/') });
  void tiles;
  await page.waitForTimeout(500);
  await shot('15-game-mid');
  console.log('playerId', playerId, 'phone', PHONE);
} catch (e) {
  console.log('FAILED', e.message);
  await shot('99-failure');
}
console.log('errors', errors.slice(0, 10));
await browser.close();
if (errors.length) process.exitCode = 1;
