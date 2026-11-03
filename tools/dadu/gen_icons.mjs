// Generates the DADU app icons (chibi Dadaji on saffron) with pureimage.
// Run: node tools/dadu/gen_icons.mjs   → writes assets/*.png
import * as PImage from 'pureimage';
import fs from 'node:fs';
import path from 'node:path';

const font = PImage.registerFont('node_modules/@expo-google-fonts/baloo-2/800ExtraBold/Baloo2_800ExtraBold.ttf', 'Baloo');
font.loadSync();

const SAFFRON = '#F4A523', PAPER = '#FFF6E5', SKIN = '#E9B98E', WHITE = '#F7F3EC', INK = '#3A2E2A', INDIGO = '#2F3C7E', CREAM = '#FFF3DC', GLASS = 'rgba(80,110,160,0.35)';

function circle(ctx, x, y, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2, false); ctx.closePath(); ctx.fill(); }
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
}
/** Chibi Dadaji head: bald crown, white side hair, rectangular tinted spectacles, thick curved moustache. s = head radius. */
function dadajiHead(ctx, cx, cy, s, mono) {
  const skin = mono ? WHITE : SKIN, hair = WHITE, ink = mono ? WHITE : INK;
  // kurta collar
  roundRect(ctx, cx - s * 0.9, cy + s * 0.75, s * 1.8, s * 0.9, s * 0.3, mono ? WHITE : CREAM);
  if (!mono) roundRect(ctx, cx - s * 0.9, cy + s * 1.45, s * 1.8, s * 0.12, s * 0.05, SAFFRON);
  // side hair
  circle(ctx, cx - s * 0.95, cy + s * 0.05, s * 0.34, hair); circle(ctx, cx + s * 0.95, cy + s * 0.05, s * 0.34, hair);
  // head
  circle(ctx, cx, cy, s, skin);
  // ears
  circle(ctx, cx - s * 1.0, cy + s * 0.1, s * 0.16, skin); circle(ctx, cx + s * 1.0, cy + s * 0.1, s * 0.16, skin);
  // forehead wrinkles
  if (!mono) { ctx.strokeStyle = '#C98F6A'; ctx.lineWidth = s * 0.035; for (const k of [-0.62, -0.5]) { ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy + s * k); ctx.quadraticCurveTo(cx, cy + s * (k - 0.08), cx + s * 0.35, cy + s * k); ctx.stroke(); } }
  // spectacles: large rectangles, tinted
  const gw = s * 0.62, gh = s * 0.42, gy = cy - s * 0.28;
  for (const sx of [-1, 1]) {
    const gx = cx + sx * s * 0.36 - gw / 2;
    roundRect(ctx, gx - s * 0.04, gy - s * 0.04, gw + s * 0.08, gh + s * 0.08, s * 0.1, ink);
    roundRect(ctx, gx, gy, gw, gh, s * 0.08, mono ? '#000000' : GLASS);
    if (!mono) { circle(ctx, cx + sx * s * 0.36, gy + gh * 0.55, s * 0.09, INK); circle(ctx, cx + sx * s * 0.36 + s * 0.03, gy + gh * 0.5, s * 0.03, '#fff'); }
  }
  if (mono) { // keep the lenses transparent in the monochrome glyph
    ctx.fillStyle = 'rgba(0,0,0,0)';
  }
  roundRect(ctx, cx - s * 0.08, gy + gh * 0.4, s * 0.16, s * 0.06, s * 0.03, ink);
  // nose
  if (!mono) { ctx.strokeStyle = '#C98F6A'; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.02); ctx.quadraticCurveTo(cx - s * 0.12, cy + s * 0.3, cx + s * 0.02, cy + s * 0.34); ctx.stroke(); }
  // moustache: thick, curved
  ctx.fillStyle = hair; ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.42);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.2, cx - s * 0.62, cy + s * 0.42);
  ctx.quadraticCurveTo(cx - s * 0.55, cy + s * 0.68, cx - s * 0.2, cy + s * 0.62);
  ctx.quadraticCurveTo(cx, cy + s * 0.56, cx + s * 0.2, cy + s * 0.62);
  ctx.quadraticCurveTo(cx + s * 0.55, cy + s * 0.68, cx + s * 0.62, cy + s * 0.42);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.2, cx, cy + s * 0.42); ctx.closePath(); ctx.fill();
  // smile
  if (!mono) { ctx.strokeStyle = '#A85B3C'; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(cx - s * 0.25, cy + s * 0.7); ctx.quadraticCurveTo(cx, cy + s * 0.86, cx + s * 0.25, cy + s * 0.7); ctx.stroke(); }
  // cheeks
  if (!mono) { circle(ctx, cx - s * 0.62, cy + s * 0.3, s * 0.1, 'rgba(242,141,166,0.45)'); circle(ctx, cx + s * 0.62, cy + s * 0.3, s * 0.1, 'rgba(242,141,166,0.45)'); }
}

async function save(img, file) { await PImage.encodePNGToStream(img, fs.createWriteStream(file)); console.log('wrote', file); }

async function main() {
  const out = 'assets';
  // app icon 1024, opaque
  { const img = PImage.make(1024, 1024); const ctx = img.getContext('2d'); ctx.fillStyle = SAFFRON; ctx.fillRect(0, 0, 1024, 1024);
    circle(ctx, 512, 440, 330, PAPER); dadajiHead(ctx, 512, 430, 190, false);
    ctx.fillStyle = INDIGO; ctx.font = '150pt Baloo'; ctx.textAlign = 'center'; ctx.fillText('DADU', 512, 930); await save(img, path.join(out, 'icon.png')); }
  // adaptive foreground (RGBA, content inside the 66% safe zone) and background
  { const img = PImage.make(1024, 1024); const ctx = img.getContext('2d'); circle(ctx, 512, 512, 300, PAPER); dadajiHead(ctx, 512, 500, 170, false); await save(img, path.join(out, 'android-icon-foreground.png')); }
  { const img = PImage.make(1024, 1024); const ctx = img.getContext('2d'); ctx.fillStyle = SAFFRON; ctx.fillRect(0, 0, 1024, 1024); await save(img, path.join(out, 'android-icon-background.png')); }
  { const img = PImage.make(432, 432); const ctx = img.getContext('2d'); dadajiHead(ctx, 216, 210, 78, true); await save(img, path.join(out, 'android-icon-monochrome.png')); }
  // splash 600 RGBA
  { const img = PImage.make(600, 600); const ctx = img.getContext('2d'); circle(ctx, 300, 250, 200, SAFFRON); dadajiHead(ctx, 300, 245, 115, false);
    ctx.fillStyle = INDIGO; ctx.font = '96pt Baloo'; ctx.textAlign = 'center'; ctx.fillText('DADU', 300, 560); await save(img, path.join(out, 'splash-icon.png')); }
  // notification 96 white glyph, favicon 48
  { const img = PImage.make(96, 96); const ctx = img.getContext('2d'); dadajiHead(ctx, 48, 46, 20, true); await save(img, path.join(out, 'notification-icon.png')); }
  { const img = PImage.make(48, 48); const ctx = img.getContext('2d'); ctx.fillStyle = SAFFRON; ctx.fillRect(0, 0, 48, 48); circle(ctx, 24, 22, 16, PAPER); dadajiHead(ctx, 24, 22, 9, false); await save(img, path.join(out, 'favicon.png')); }
}
main().catch((e) => { console.error(e); process.exit(1); });
