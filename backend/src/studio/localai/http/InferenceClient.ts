import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { assertInternalEndpoint } from "../endpointPolicy";
import { LocalAiError } from "../types";

/**
 * Client for the internal GPU inference API (see inference-server/ and
 * docs/architecture/local-ai.md). Every request is a signed job:
 *
 *   Authorization: Bearer <INFERENCE_API_KEY>
 *   X-Atma-Job-Id:  <uuid>
 *   X-Atma-Timestamp: <unix seconds>
 *   X-Atma-Signature: hex(HMAC-SHA256(INFERENCE_SIGNING_SECRET, `${timestamp}.${jobId}.${sha256(body)}`))
 *
 * The server rejects missing/invalid signatures, timestamps older than five
 * minutes (replay protection) and bodies over its size limit.
 */
export interface InferenceClientOptions {
  baseUrl: string;
  apiKey?: string;
  signingSecret?: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export interface InferenceResponse {
  outputs: Record<string, string>; // base64 payloads by name
  model: string;
  modelVersion?: string;
  durationMs?: number;
  gpuWorkerId?: string;
  metadata?: Record<string, unknown>;
}

export function signBody(secret: string, timestamp: string, jobId: string, body: string): string {
  const digest = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret).update(`${timestamp}.${jobId}.${digest}`).digest("hex");
}

/** Server-side verification helper (used by tests and by any Node-based inference gateway). */
export function verifySignature(secret: string, headers: { timestamp?: string; jobId?: string; signature?: string }, body: string, nowSeconds = Math.floor(Date.now() / 1000), maxSkew = 300): boolean {
  if (!headers.timestamp || !headers.jobId || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > maxSkew) return false;
  const expected = Buffer.from(signBody(secret, headers.timestamp, headers.jobId, body), "hex");
  const got = Buffer.from(headers.signature, "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export class InferenceClient {
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: InferenceClientOptions) {
    this.base = assertInternalEndpoint(opts.baseUrl, !!opts.apiKey, "Inference API").toString().replace(/\/$/, "");
    if (!opts.signingSecret) throw new LocalAiError("INFERENCE_SIGNING_SECRET is required to sign inference jobs", false, "CONFIG");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async health(): Promise<{ ok: boolean; models?: string[]; gpu?: unknown }> {
    try {
      const res = await this.fetchImpl(`${this.base}/v1/health`, { headers: this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}, signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { ok: false };
      return { ok: true, ...((await res.json()) as { models?: string[]; gpu?: unknown }) };
    } catch {
      return { ok: false };
    }
  }

  async run(task: "image-generation" | "segmentation" | "depth" | "inpainting" | "i2v", payload: { model: string; inputs: Record<string, string>; params: Record<string, unknown> }, opts: { jobId?: string; signal?: AbortSignal } = {}): Promise<InferenceResponse> {
    const jobId = opts.jobId ?? randomUUID();
    const body = JSON.stringify({ jobId, ...payload });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signBody(this.opts.signingSecret!, timestamp, jobId, body);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.opts.timeoutMs);
    const onAbort = () => ctrl.abort();
    opts.signal?.addEventListener("abort", onAbort);
    try {
      const res = await this.fetchImpl(`${this.base}/v1/${task}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}),
          "X-Atma-Job-Id": jobId,
          "X-Atma-Timestamp": timestamp,
          "X-Atma-Signature": signature,
        },
        body,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const retryable = res.status >= 500 || res.status === 429 || res.status === 503;
        throw new LocalAiError(`Inference ${task} → HTTP ${res.status}: ${text.slice(0, 300)}`, retryable, res.status === 401 || res.status === 403 ? "CONFIG" : retryable ? "UNAVAILABLE" : "REJECTED");
      }
      const json = (await res.json()) as InferenceResponse;
      if (!json || typeof json.outputs !== "object") throw new LocalAiError(`Inference ${task}: malformed response`, false, "BAD_RESPONSE");
      return json;
    } catch (e) {
      if (e instanceof LocalAiError) throw e;
      if (opts.signal?.aborted) throw new LocalAiError("Cancelled", false, "CANCELLED");
      if (ctrl.signal.aborted) throw new LocalAiError(`Inference ${task} timed out after ${this.opts.timeoutMs} ms`, true, "TIMEOUT");
      throw new LocalAiError(`Inference API unreachable: ${(e as Error).message}`, true, "UNAVAILABLE");
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    }
  }
}
