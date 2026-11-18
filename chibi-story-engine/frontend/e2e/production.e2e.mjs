// End-to-end test of the production dashboard (Phase 10 acceptance), driving a real browser against the
// real backend, database, Blender and FFmpeg.   Run:  npm run build && npm run e2e
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Resolved with require so a globally installed Playwright (with its matching browser) is found as well as a local one.
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PY = join(ROOT, ".venv/bin/python");
const PORT = 8765;
const BASE = `http://127.0.0.1:${PORT}`;
const DB = "csae_e2e";
const PG = { PGPASSWORD: "csae-dev", PGHOST: "localhost", PGUSER: "csae" };
const SHOTS = join(ROOT, "docs", "screenshots");
const EMAIL = "producer@studio.test";
const PASSWORD = "correct-horse-battery";
const STORY = `एक नदी के किनारे जामुन का एक बड़ा पेड़ था। उस पेड़ पर एक चतुर बंदर रहता था।

एक दिन एक मगरमच्छ तैरता हुआ पेड़ के नीचे आया। बंदर ने कहा, "मित्र, ये मीठे जामुन खाओ।" मगरमच्छ खुश होकर बोला, "धन्यवाद, मित्र!"`;

let server, browser, page;
const env = {
  ...process.env, CSAE_ENV: "test", CSAE_DATABASE_URL: `postgresql+psycopg://csae:csae-dev@localhost:5432/${DB}`,
  CSAE_DATA_ROOT: mkdtempSync(join(tmpdir(), "csae-e2e-")), CSAE_ASSET_LIBRARY: join(ROOT, "asset_library"),
  CSAE_FRONTEND_DIST: join(ROOT, "frontend", "dist"), CSAE_LOG_LEVEL: "WARNING",
};

before(async () => {
  mkdirSync(SHOTS, { recursive: true });
  execFileSync("psql", ["-d", "postgres", "-qc", `drop database if exists ${DB}`], { env: { ...process.env, ...PG } });
  execFileSync("psql", ["-d", "postgres", "-qc", `create database ${DB}`], { env: { ...process.env, ...PG } });
  execFileSync(join(ROOT, ".venv/bin/alembic"), ["upgrade", "head"], { cwd: ROOT, env });
  execFileSync(PY, ["-m", "backend.cli", "create-user", EMAIL, "--role", "admin"], { cwd: ROOT, env: { ...env, CSAE_USER_PASSWORD: PASSWORD } });
  server = spawn(PY, ["-m", "backend.cli", "serve", "--port", String(PORT)], { cwd: ROOT, env, stdio: ["ignore", "inherit", "inherit"] });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch();
  page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
  page.on("pageerror", (e) => assert.fail(`page error: ${e.message}`));
});

after(async () => {
  await browser?.close();
  server?.kill();
});

const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const nav = (label) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true }).click();

test("sign in", async () => {
  await page.goto(BASE);
  await page.getByLabel("E-mail").fill(EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("alert").filter({ hasText: "incorrect" }).waitFor();
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
});

test("1. user creates a project", async () => {
  await page.getByLabel("New project name").fill("Panchatantra Tales");
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByTestId("project").filter({ hasText: "Panchatantra Tales" }).waitFor();
  await shot("01_dashboard");
});

test("2. user enters a Hindi story", async () => {
  await nav("Story Studio");
  await page.getByLabel("Story title").fill("बंदर और मगरमच्छ");
  await page.getByLabel("Story text").fill(STORY);
  await page.getByRole("button", { name: "Save story" }).click();
  await page.getByRole("heading", { name: "Edit story" }).waitFor();
  const current = page.getByLabel("Current story").locator("option:checked");      // the story list refreshes just after the heading appears
  for (let i = 0; i < 40 && (await current.innerText()) !== "बंदर और मगरमच्छ"; i++) await page.waitForTimeout(250);
  assert.equal(await current.innerText(), "बंदर और मगरमच्छ");
});

test("3. user generates a storyboard", async () => {
  await page.getByRole("button", { name: "Generate storyboard" }).click();
  await page.getByRole("heading", { name: "Storyboard generated" }).waitFor({ timeout: 60000 });
  const map = await page.getByTestId("character-map").innerText();
  assert.match(map, /monkey → monkey_001/);
  assert.match(map, /crocodile → crocodile_001/);
  await shot("02_story_studio");
  await page.getByRole("button", { name: "Open storyboard" }).click();
  await page.getByTestId("scene-card").nth(1).waitFor();
  assert.equal(await page.getByTestId("scene-card").count(), 2);
  await page.getByText("“मित्र, ये मीठे जामुन खाओ।”").waitFor();
  await page.locator("img[alt='Still of scene 1']").evaluate((img) => img.complete || new Promise((r) => (img.onload = r)));
  await shot("03_storyboard");
});

test("4. user edits a scene", async () => {
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: /Scene 1:/ }) });
  await card.getByRole("button", { name: "Edit" }).click();
  await card.getByLabel("Title").fill("नदी किनारे का पेड़");
  await card.getByLabel("Time of day").selectOption("morning");
  await card.getByRole("button", { name: "Save scene" }).click();
  await page.getByRole("heading", { name: "Scene 1: नदी किनारे का पेड़" }).waitFor();
  await page.getByText("version 2").waitFor();
  await page.locator("section").filter({ has: page.getByRole("heading", { name: /Scene 1:/ }) }).getByText("morning, clear").waitFor();
});

test("5. user selects a character", async () => {
  await nav("Character Library");
  await page.getByTestId("character-monkey_001").click();
  await page.getByRole("heading", { name: /Monkey \(monkey_001/ }).waitFor();
  await page.getByLabel("Story character").selectOption("monkey");
  await page.getByRole("button", { name: "Select for story" }).click();
  await page.getByRole("status").filter({ hasText: "is now played by Monkey" }).waitFor({ timeout: 60000 });
  await shot("04_character_library");
  await nav("Environment Library");
  await page.getByTestId("environment-forest_river_001").click();
  await page.getByRole("heading", { name: /Riverbank with a jamun tree/ }).waitFor();
  await shot("05_environment_library");
  // the expanded library: filter to the haunted category, open a background and change its scare level
  await page.getByLabel("Search backgrounds").fill("haunted");
  await page.getByTestId("environment-env-hnt-0001").click();
  await page.getByRole("heading", { name: /Haunted forest/ }).waitFor();
  await page.getByLabel("Scare level").selectOption("0");
  await page.getByTestId("environment-preview").evaluate((img) => (img.complete && img.naturalWidth > 0) || new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("environment preview failed to load")); setTimeout(() => rej(new Error("environment preview timed out")), 60000); }));
  await shot("05b_environment_haunted_scare0");
  await nav("Animation Studio");
  await page.getByTestId("animation-still").evaluate((img) => img.complete || new Promise((r) => (img.onload = r)));
  await shot("06_animation_studio");
  await nav("Timeline Editor");
  await page.getByTestId("timeline").first().waitFor();
  await shot("07_timeline_editor");
});

test("6. user previews a scene", async () => {
  await nav("Storyboard");
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: /Scene 1:/ }) });
  await card.getByRole("button", { name: "Preview" }).click();
  const video = card.getByTestId("scene-preview");
  await video.waitFor({ timeout: 300000 });
  await video.evaluate((v) => v.readyState >= 1 || new Promise((r) => (v.onloadedmetadata = r)));
  const duration = await video.evaluate((v) => v.duration);
  assert.ok(duration > 3, `preview lasts ${duration}s`);
});

test("7. user generates narration", async () => {
  await nav("Voice Studio");
  await page.getByRole("button", { name: "Generate narration" }).click();
  const result = page.getByTestId("audio-result");
  await result.waitFor({ timeout: 120000 });
  assert.match(await result.innerText(), /lines generated/);
  await page.getByTestId("audio-clip").nth(3).waitFor({ timeout: 60000 }); // the clip list reloads just after the result banner appears
  assert.ok((await page.getByTestId("audio-clip").count()) >= 4);
  await shot("08_voice_studio");
});

test("8-9. user starts a render and monitors its progress", async () => {
  await nav("Render Manager");
  await page.getByRole("button", { name: "Render preview (360p)" }).click();
  const job = page.locator("section").filter({ has: page.getByTestId("job").filter({ hasText: "Story render (preview)" }) }).first();
  await job.waitFor();
  const seen = new Set();
  for (let i = 0; i < 600; i++) {
    const status = (await job.getByTestId("job").innerText()).split(" ").pop();
    seen.add(status);
    seen.add(`p${await job.getByTestId("job-progress").innerText()}`);
    if (i === 6) await shot("09_render_manager_running");
    if (["completed", "failed", "cancelled"].includes(status)) break;
    await page.waitForTimeout(1000);
  }
  assert.ok(seen.has("completed"), `job ended as ${[...seen].join(",")}`);
  assert.ok([...seen].filter((s) => s.startsWith("p")).length >= 3, "progress was reported while rendering");
  await shot("10_render_manager_done");
});

test("10. user downloads a valid video", async () => {
  const href = await page.getByTestId("job-output").first().getAttribute("href");
  const response = await fetch(new URL(href, BASE));
  assert.equal(response.status, 200);
  const file = join(env.CSAE_DATA_ROOT, "downloaded.mp4");
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-of", "json", file]).toString());
  const video = info.streams.find((s) => s.codec_type === "video");
  const audio = info.streams.find((s) => s.codec_type === "audio");
  assert.equal(video.codec_name, "h264");
  assert.equal(`${video.width}x${video.height}`, "640x360");
  assert.equal(video.avg_frame_rate, "24/1");
  assert.ok(Number(video.duration) > 10 && audio, "has picture and sound");
  assert.ok(Math.abs(Number(video.duration) - Number(audio.duration)) < 0.2, "sound and picture have the same length");
  execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", file, "-f", "null", "-"]);       // decodes without error

  await nav("Quality Control");
  await page.getByRole("button", { name: "Run quality check" }).click();
  await page.getByTestId("qc-verdict").filter({ hasText: "Automatic checks passed" }).waitFor({ timeout: 120000 });
  await shot("11_quality_control");
  await nav("Export");
  await page.getByTestId("download").first().waitFor();
  await shot("12_export");
});
