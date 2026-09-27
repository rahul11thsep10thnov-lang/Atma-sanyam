// Generates royalty-free placeholder "art" images for the bundled image pack.
// These are simple procedurally-drawn gradients/shapes, not photographs —
// swap the files in assets/images/art/ with real curated photos later.
const fs = require('fs');
const path = require('path');
const pureimage = require('pureimage');

const SIZE = 512;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'images', 'art');

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function rgb(c) {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function drawVerticalGradient(ctx, topColor, bottomColor) {
  for (let y = 0; y < SIZE; y++) {
    const t = y / SIZE;
    const c = [
      lerp(topColor[0], bottomColor[0], t),
      lerp(topColor[1], bottomColor[1], t),
      lerp(topColor[2], bottomColor[2], t),
    ];
    ctx.fillStyle = rgb(c);
    ctx.fillRect(0, y, SIZE, 1);
  }
}

function drawSun(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTriangleMountain(ctx, baseY, peakY, x1, x2, color) {
  const cx = (x1 + x2) / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, baseY);
  ctx.lineTo(cx, peakY);
  ctx.lineTo(x2, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawCircleBlob(ctx, cx, cy, r, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

async function save(img, name) {
  const outPath = path.join(OUT_DIR, `${name}.png`);
  const stream = fs.createWriteStream(outPath);
  await pureimage.encodePNGToStream(img, stream);
  console.log('wrote', outPath);
}

async function makeForest() {
  const img = pureimage.make(SIZE, SIZE);
  const ctx = img.getContext('2d');
  drawVerticalGradient(ctx, [24, 58, 46], [12, 30, 24]);
  for (let i = 0; i < 5; i++) {
    const baseY = SIZE - 40 - i * 30;
    for (let x = -60; x < SIZE + 60; x += 90) {
      drawTriangleMountain(ctx, baseY, baseY - 150 + i * 8, x + (i % 2 === 0 ? 0 : 45), x + 90 + (i % 2 === 0 ? 0 : 45), rgb([20 + i * 10, 50 + i * 14, 34 + i * 8]));
    }
  }
  await save(img, 'forest');
}

async function makeOcean() {
  const img = pureimage.make(SIZE, SIZE);
  const ctx = img.getContext('2d');
  drawVerticalGradient(ctx, [20, 60, 90], [10, 90, 110]);
  ctx.fillStyle = rgb([230, 240, 230]);
  for (let y = SIZE * 0.55; y < SIZE; y += 22) {
    for (let x = 0; x < SIZE; x += 60) {
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x + (y % 44), y, 34, 4);
    }
  }
  ctx.globalAlpha = 1;
  await save(img, 'ocean');
}

async function makeMountain() {
  const img = pureimage.make(SIZE, SIZE);
  const ctx = img.getContext('2d');
  drawVerticalGradient(ctx, [70, 90, 120], [200, 210, 220]);
  drawTriangleMountain(ctx, SIZE * 0.85, SIZE * 0.25, -40, SIZE * 0.55, rgb([60, 70, 90]));
  drawTriangleMountain(ctx, SIZE * 0.85, SIZE * 0.4, SIZE * 0.25, SIZE * 0.9, rgb([90, 100, 120]));
  drawTriangleMountain(ctx, SIZE * 0.85, SIZE * 0.15, SIZE * 0.45, SIZE + 40, rgb([120, 130, 150]));
  ctx.fillStyle = rgb([245, 248, 250]);
  ctx.globalAlpha = 0.9;
  drawTriangleMountain(ctx, SIZE * 0.34, SIZE * 0.15, SIZE * 0.4, SIZE * 0.55, rgb([245, 248, 250]));
  ctx.globalAlpha = 1;
  await save(img, 'mountain');
}

async function makeSunset() {
  const img = pureimage.make(SIZE, SIZE);
  const ctx = img.getContext('2d');
  drawVerticalGradient(ctx, [255, 140, 90], [90, 40, 80]);
  drawSun(ctx, SIZE / 2, SIZE * 0.55, 90, rgb([255, 210, 120]));
  for (let i = 0; i < 4; i++) {
    drawTriangleMountain(ctx, SIZE, SIZE * (0.6 + i * 0.08), -30 + i * 70, SIZE * 0.6 + i * 70, rgb([40 - i * 5, 20, 30 + i * 5]));
  }
  await save(img, 'sunset');
}

async function makeMeadow() {
  const img = pureimage.make(SIZE, SIZE);
  const ctx = img.getContext('2d');
  drawVerticalGradient(ctx, [140, 200, 230], [190, 230, 240]);
  ctx.fillStyle = rgb([120, 170, 90]);
  ctx.fillRect(0, SIZE * 0.62, SIZE, SIZE * 0.38);
  for (let i = 0; i < 40; i++) {
    const x = (i * 53) % SIZE;
    const y = SIZE * 0.65 + ((i * 37) % (SIZE * 0.3));
    drawCircleBlob(ctx, x, y, 6, rgb([230, 210, 90]), 0.8);
  }
  await save(img, 'meadow');
}

async function makeAurora() {
  const img = pureimage.make(SIZE, SIZE);
  const ctx = img.getContext('2d');
  drawVerticalGradient(ctx, [10, 15, 30], [20, 30, 50]);
  drawCircleBlob(ctx, SIZE * 0.3, SIZE * 0.3, 220, rgb([60, 200, 160]), 0.35);
  drawCircleBlob(ctx, SIZE * 0.7, SIZE * 0.45, 200, rgb([120, 90, 220]), 0.3);
  drawCircleBlob(ctx, SIZE * 0.5, SIZE * 0.2, 180, rgb([90, 180, 220]), 0.3);
  for (let i = 0; i < 60; i++) {
    const x = (i * 83) % SIZE;
    const y = (i * 131) % Math.round(SIZE * 0.6);
    drawCircleBlob(ctx, x, y, 1.5, rgb([255, 255, 255]), 0.6);
  }
  await save(img, 'aurora');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await makeForest();
  await makeOcean();
  await makeMountain();
  await makeSunset();
  await makeMeadow();
  await makeAurora();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
