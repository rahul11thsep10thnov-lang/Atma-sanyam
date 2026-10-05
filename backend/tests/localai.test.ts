import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { AiModel } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_MODELS } from "../src/studio/models/defaultModels";
import { licenseVerdict, rankModels, resolveModel, LicenseGateError } from "../src/studio/models/modelRegistry";
import { assertInternalEndpoint, isPrivateHost } from "../src/studio/localai/endpointPolicy";
import { fillTemplate, loadWorkflow } from "../src/studio/localai/comfyui/workflowTemplate";
import { ComfyUIClient } from "../src/studio/localai/comfyui/ComfyUIClient";
import { ComfyImageProvider, fitGenerationSize } from "../src/studio/localai/comfyui/adapters";
import { InferenceClient, signBody, verifySignature } from "../src/studio/localai/http/InferenceClient";
import { HttpDepthProvider } from "../src/studio/localai/http/adapters";
import { AlphaMatteSegmentationProvider, DiffusionFillInpaintingProvider, ProceduralImageProvider, pushPullFill } from "../src/studio/localai/procedural";
import { createImage, decodeImageBuffer, encodePng, encodeGrayPng } from "../src/studio/engine25d/raster";
import { decodePng, encodePngRgba } from "../src/studio/media/png";
import { LocalAiError } from "../src/studio/localai/types";

function model(over: Partial<AiModel>): AiModel {
  return {
    id: over.modelId ?? "m",
    modelId: "m",
    name: "M",
    provider: "comfyui",
    task: "IMAGE_GENERATION",
    version: "1",
    endpoint: null,
    workflow: null,
    license: "Apache-2.0",
    licenseUrl: null,
    licenseVerifiedAt: null,
    licenseNotes: null,
    commercialUseAllowed: true,
    productionApproved: true,
    attributionRequired: false,
    attributionText: null,
    redistributionNotes: null,
    localOnly: true,
    gpuRequirement: null,
    recommendedVramGb: 0,
    qualityScore: 50,
    speedScore: 50,
    enabled: true,
    isDefault: false,
    overrideApproved: false,
    overrideReason: null,
    overrideBy: null,
    config: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  } as AiModel;
}

function fakePrisma(models: AiModel[]) {
  return {
    aiModel: {
      findMany: async ({ where }: { where: { task: string; enabled: boolean } }) => models.filter((m) => m.task === where.task && m.enabled === where.enabled),
      findUnique: async ({ where }: { where: { modelId: string } }) => models.find((m) => m.modelId === where.modelId) ?? null,
    },
  } as never;
}

describe("licence gate", () => {
  it("classifies licence states and never assumes commercial permission", () => {
    expect(licenseVerdict(model({})).status).toBe("CLEARED");
    expect(licenseVerdict(model({ commercialUseAllowed: false, productionApproved: false })).status).toBe("BLOCKED_NON_COMMERCIAL");
    expect(licenseVerdict(model({ productionApproved: false })).status).toBe("BLOCKED_NOT_APPROVED");
    const o = licenseVerdict(model({ commercialUseAllowed: false, productionApproved: false, overrideApproved: true, overrideBy: "editor", overrideReason: "Licence purchased 2026-09" }));
    expect(o.status).toBe("OVERRIDDEN");
    expect(o.productionAllowed).toBe(true);
  });

  it("registry defaults: every non-commercial or unverified model is blocked for production", () => {
    for (const m of DEFAULT_MODELS) {
      if (!m.licenseVerifiedAt && m.provider !== "procedural") expect(m.productionApproved, m.modelId).toBe(false);
      if (!m.commercialUseAllowed) expect(m.productionApproved, m.modelId).toBe(false);
    }
    expect(DEFAULT_MODELS.find((m) => m.modelId === "flux1-dev")!.commercialUseAllowed).toBe(false);
    expect(DEFAULT_MODELS.find((m) => m.modelId === "depth-anything-v2-large")!.commercialUseAllowed).toBe(false);
  });

  it("ranks real models before the procedural fallback, admin default first", () => {
    const ranked = rankModels([model({ modelId: "proc", provider: "procedural", isDefault: true, qualityScore: 99 }), model({ modelId: "a", qualityScore: 60 }), model({ modelId: "b", isDefault: true, qualityScore: 40 })]);
    expect(ranked.map((m) => m.modelId)).toEqual(["b", "a", "proc"]);
  });

  it("production resolution skips blocked and unavailable models and falls back to procedural", async () => {
    const models = [
      model({ modelId: "nc", commercialUseAllowed: false, productionApproved: false, qualityScore: 95 }),
      model({ modelId: "down", qualityScore: 90 }),
      model({ modelId: "proc", provider: "procedural", isDefault: true }),
    ];
    const r = await resolveModel(fakePrisma(models), "IMAGE_GENERATION", { purpose: "production", isAvailable: async (m) => m.modelId !== "down" });
    expect(r!.model.modelId).toBe("proc");
    expect(r!.skipped.map((s) => s.modelId)).toEqual(["nc", "down"]);
    // previews may use a non-commercial model (never publishable)
    const p = await resolveModel(fakePrisma(models), "IMAGE_GENERATION", { purpose: "preview", isAvailable: async () => true });
    expect(p!.model.modelId).toBe("nc");
    expect(p!.verdict.productionAllowed).toBe(false);
    // forcing a blocked model for production throws the licence error
    await expect(resolveModel(fakePrisma(models), "IMAGE_GENERATION", { purpose: "production", modelId: "nc" })).rejects.toBeInstanceOf(LicenseGateError);
  });
});

describe("endpoint policy", () => {
  it("accepts internal hosts and rejects public unauthenticated endpoints", () => {
    for (const h of ["localhost", "127.0.0.1", "10.2.3.4", "192.168.1.9", "172.20.0.5", "comfyui", "gpu-1.internal", "::1"]) expect(isPrivateHost(h), h).toBe(true);
    for (const h of ["8.8.8.8", "example.com", "172.32.0.1"]) expect(isPrivateHost(h), h).toBe(false);
    expect(() => assertInternalEndpoint("http://comfyui:8188", false, "x")).not.toThrow();
    expect(() => assertInternalEndpoint("http://gpu.example.com", true, "x")).toThrow(LocalAiError);
    expect(() => assertInternalEndpoint("https://gpu.example.com", false, "x")).toThrow(LocalAiError);
    expect(() => assertInternalEndpoint("https://gpu.example.com", true, "x")).not.toThrow();
    expect(() => assertInternalEndpoint("http://user:pw@10.0.0.2:8188", false, "x")).toThrow(/credentials/);
  });
});

describe("workflow templates", () => {
  it("fills typed placeholders, strips docs and refuses unfilled templates", () => {
    const t = { _meta_template: { x: "{{nope}}" }, "1": { inputs: { seed: "{{seed}}", text: "a {{prompt}} b", flag: "{{flag}}" } } };
    expect(fillTemplate(t, { seed: 42, prompt: "cat", flag: true })).toEqual({ "1": { inputs: { seed: 42, text: "a cat b", flag: true } } });
    expect(() => fillTemplate(t, { seed: 1 })).toThrow(/prompt/);
  });

  it("every shipped workflow fills completely from its registry config plus request values", async () => {
    const request = { prompt: "p", negative_prompt: "n", seed: 1, width: 512, height: 896, steps: 4, cfg: 1, sampler: "euler", scheduler: "simple", filename_prefix: "t", input_image: "in.png", mask_image: "m.png", resolution: 512, length: 49 };
    for (const m of DEFAULT_MODELS.filter((x) => x.workflow)) {
      const wf = await loadWorkflow(m.workflow!);
      const filled = fillTemplate(wf, { ...request, ...((m.config ?? {}) as Record<string, string | number>) }) as Record<string, { class_type: string }>;
      expect(Object.values(filled).every((n) => typeof n.class_type === "string"), m.modelId).toBe(true);
      expect(JSON.stringify(filled)).not.toMatch(/\{\{/);
    }
  });

  it("fits generation sizes to ~1.6 MP in multiples of 16", () => {
    const s = fitGenerationSize(1296, 2304);
    expect(s.width % 16).toBe(0);
    expect(s.height % 16).toBe(0);
    expect(s.width * s.height).toBeLessThanOrEqual(1_700_000);
    expect(s.height / s.width).toBeCloseTo(2304 / 1296, 1);
  });
});

// ---------------------------------------------------------------------------
// Mock GPU services
// ---------------------------------------------------------------------------

function listen(handler: (req: IncomingMessage, res: ServerResponse, body: Buffer) => void): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => handler(req, res, Buffer.concat(chunks)));
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }));
  });
}

const tinyPng = (r: number, g: number, b: number, w = 4, h = 4) => encodePngRgba(w, h, new Uint8Array(w * h * 4).map((_, i) => [r, g, b, 255][i % 4]));

describe("ComfyUI adapter against a mock server", () => {
  let mock: { server: Server; url: string };
  const queued: Record<string, unknown>[] = [];
  let polls = 0;
  beforeAll(async () => {
    mock = await listen((req, res, body) => {
      if (req.headers.authorization !== "Bearer comfy-key") {
        res.writeHead(401).end();
        return;
      }
      if (req.url === "/prompt" && req.method === "POST") {
        queued.push(JSON.parse(body.toString()).prompt);
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ prompt_id: "p1" }));
      } else if (req.url === "/history/p1") {
        polls++;
        const done = polls >= 2;
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(done ? { p1: { status: { status_str: "success", completed: true }, outputs: { "7": { images: [{ filename: "atma_0001.png", subfolder: "atma", type: "output" }] } } } } : {}));
      } else if (req.url?.startsWith("/view?")) {
        res.writeHead(200, { "Content-Type": "image/png" }).end(tinyPng(200, 30, 30));
      } else if (req.url === "/system_stats") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ devices: [{ name: "mock" }] }));
      } else res.writeHead(404).end();
    });
  });
  afterAll(() => mock.server.close());

  it("queues the filled FLUX workflow, polls history and downloads the output", async () => {
    // A loopback mock is "internal", but the key is still sent for proxies.
    const client = new ComfyUIClient({ baseUrl: mock.url, apiKey: "comfy-key", timeoutMs: 10_000, pollIntervalMs: 10 });
    expect((await client.health()).ok).toBe(true);
    const flux = DEFAULT_MODELS.find((m) => m.modelId === "flux1-schnell")!;
    const m = model({ modelId: flux.modelId, workflow: flux.workflow!, config: flux.config as never });
    const out = await new ComfyImageProvider(client).generateSceneAsset({ role: "character", prompt: "a man waiting", negativePrompt: "gore", width: 600, height: 1100, seed: 1234, style: "s", transparent: true }, m);
    expect(out.isPlaceholder).toBe(false);
    expect(out.hasAlpha).toBe(false); // matted later by segmentation
    expect((await decodeImageBuffer(out.files[0].data)).width).toBe(4);
    const wf = queued[0] as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    expect(wf["5"].inputs.seed).toBe(1234);
    expect(wf["5"].inputs.steps).toBe(4);
    expect(wf["1"].inputs.ckpt_name).toBe("flux1-schnell-fp8.safetensors");
    expect(String(wf["2"].inputs.text)).toMatch(/plain flat light grey background/);
    expect((wf["4"].inputs.width as number) % 16).toBe(0);
    expect(out.provenance.license).toBe("Apache-2.0");
  });
});

describe("signed inference API against a mock server", () => {
  let mock: { server: Server; url: string };
  const seen: { verified: boolean }[] = [];
  beforeAll(async () => {
    mock = await listen((req, res, body) => {
      const verified =
        req.headers.authorization === "Bearer inf-key" &&
        verifySignature("s3cret", { timestamp: String(req.headers["x-atma-timestamp"]), jobId: String(req.headers["x-atma-job-id"]), signature: String(req.headers["x-atma-signature"]) }, body.toString());
      if (req.url === "/v1/health") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ models: ["depth-anything-v2-small"] }));
        return;
      }
      seen.push({ verified });
      if (!verified) {
        res.writeHead(401).end("bad signature");
        return;
      }
      const gray = encodeGrayPng(3, 2, new Float32Array([0, 0.5, 1, 0, 0.5, 1]));
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ outputs: { depth: gray.toString("base64") }, model: "depth-anything-v2-small", durationMs: 12, gpuWorkerId: "gpu-a" }));
    });
  });
  afterAll(() => mock.server.close());

  it("signs jobs, and the server-side verifier rejects tampering and replays", async () => {
    const body = JSON.stringify({ a: 1 });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signBody("k", ts, "job", body);
    expect(verifySignature("k", { timestamp: ts, jobId: "job", signature: sig }, body)).toBe(true);
    expect(verifySignature("k", { timestamp: ts, jobId: "job", signature: sig }, body + " ")).toBe(false);
    expect(verifySignature("k", { timestamp: String(Number(ts) - 3600), jobId: "job", signature: signBody("k", String(Number(ts) - 3600), "job", body) }, body)).toBe(false);
    expect(verifySignature("other", { timestamp: ts, jobId: "job", signature: sig }, body)).toBe(false);
  });

  it("runs a depth job end to end with provenance", async () => {
    const client = new InferenceClient({ baseUrl: mock.url, apiKey: "inf-key", signingSecret: "s3cret", timeoutMs: 5000 });
    expect((await client.health()).ok).toBe(true);
    const res = await new HttpDepthProvider(client).estimate({ image: tinyPng(10, 10, 10) }, model({ modelId: "depth-anything-v2-small", task: "DEPTH", provider: "http-inference" }));
    expect(res.width).toBe(3);
    expect(res.provenance.gpuWorkerId).toBe("gpu-a");
    expect(seen.at(-1)!.verified).toBe(true);
    const wrong = new InferenceClient({ baseUrl: mock.url, apiKey: "inf-key", signingSecret: "wrong", timeoutMs: 5000 });
    await expect(new HttpDepthProvider(wrong).estimate({ image: tinyPng(1, 1, 1) }, model({ task: "DEPTH" }))).rejects.toThrow(/401/);
  });

  it("refuses to build a client without a signing secret", () => {
    expect(() => new InferenceClient({ baseUrl: mock.url, timeoutMs: 1000 })).toThrow(/SIGNING_SECRET/);
  });
});

describe("procedural local providers", () => {
  const proc = model({ modelId: "atma-procedural-v1", provider: "procedural", license: "Proprietary (this codebase)" });

  it("paints a background plate with a depth map, flagged as placeholder", async () => {
    const out = await new ProceduralImageProvider().generateSceneAsset(
      { role: "background", prompt: "", negativePrompt: "", width: 216, height: 384, seed: 3, style: "s", transparent: false, painterHint: { painter: "railway_platform", timeOfDay: "evening" } },
      proc,
    );
    expect(out.kind).toBe("image");
    expect(out.isPlaceholder).toBe(true);
    expect(out.depthFile).toBe("depth.png");
    const depth = await decodeImageBuffer(out.files.find((f) => f.name === "depth.png")!.data);
    // sky (top) is far, platform floor (bottom) is near
    expect(depth.data[(5 * depth.width + 100) * 4]).toBeLessThan(depth.data[((depth.height - 5) * depth.width + 100) * 4]);
  });

  it("builds a cut-out character rig with all body parts", async () => {
    const out = await new ProceduralImageProvider().generateSceneAsset(
      { role: "character", prompt: "", negativePrompt: "", width: 120, height: 300, seed: 3, style: "s", transparent: true, painterHint: { character: { key: "CHAR_01", gender: "FEMALE", ageGroup: "ADULT", role: "teacher", appearance: { clothing: "green saree" } } } },
      proc,
    );
    expect(out.kind).toBe("rig");
    const rig = JSON.parse(out.files.find((f) => f.name === "rig.json")!.data.toString());
    expect(rig.look.outfit).toBe("saree");
    for (const p of ["pelvis", "torso", "head", "upperArmL", "foreArmR", "thighL", "shinR", "skirt"]) expect(rig.parts.some((x: { name: string }) => x.name === p), p).toBe(true);
    expect(out.files.some((f) => f.name === "head_overlay.png")).toBe(true);
  });

  it("mattes a subject on a plain backdrop", async () => {
    const W = 60;
    const rgba = new Uint8Array(W * W * 4);
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        const inside = (x - 30) ** 2 + (y - 30) ** 2 < 15 ** 2;
        rgba.set(inside ? [200, 40, 40, 255] : [205, 205, 205, 255], (y * W + x) * 4);
      }
    const res = await new AlphaMatteSegmentationProvider().segment({ image: encodePngRgba(W, W, rgba), mode: "subject" }, proc);
    expect(res.coverage).toBeGreaterThan((Math.PI * 225) / 3600 - 0.03);
    expect(res.coverage).toBeLessThan((Math.PI * 225) / 3600 + 0.03);
  });

  it("fills holes smoothly from their surroundings", async () => {
    const img = createImage(40, 20);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 40; x++) img.data.set([x / 39, 0.5, 0.2, 1], (y * 40 + x) * 4);
    const hole = new Float32Array(800);
    for (let y = 6; y < 14; y++) for (let x = 15; x < 25; x++) hole[y * 40 + x] = 1;
    const filled = pushPullFill(img, hole, 1);
    const at = (x: number, y: number) => filled.data[(y * 40 + x) * 4];
    expect(at(20, 10)).toBeGreaterThan(0.38);
    expect(at(20, 10)).toBeLessThan(0.65);
    expect(filled.data[(10 * 40 + 20) * 4 + 3]).toBeCloseTo(1, 2);
    const res = await new DiffusionFillInpaintingProvider().inpaint({ image: encodePng(img), mask: encodeGrayPng(40, 20, hole) }, proc);
    expect(res.width).toBe(40);
  });

  it("decodes the PNGs it encodes", () => {
    const rgba = new Uint8Array([1, 2, 3, 255, 9, 8, 7, 128, 50, 60, 70, 0, 255, 255, 255, 255]);
    const d = decodePng(encodePngRgba(2, 2, rgba))!;
    expect([...d.rgba]).toEqual([...rgba]);
    const g = decodePng(encodeGrayPng(2, 1, new Float32Array([0, 1])))!;
    expect([...g.rgba]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });
});
