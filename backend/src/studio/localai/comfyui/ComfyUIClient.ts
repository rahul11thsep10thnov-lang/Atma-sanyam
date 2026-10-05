import { randomUUID } from "node:crypto";
import { assertInternalEndpoint } from "../endpointPolicy";
import { LocalAiError } from "../types";

export interface ComfyOutputImage {
  filename: string;
  subfolder: string;
  type: string;
}

export interface ComfyClientOptions {
  baseUrl: string;
  /** Bearer token for an authenticating reverse proxy in front of ComfyUI (ComfyUI itself has no auth). */
  apiKey?: string;
  timeoutMs: number;
  pollIntervalMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Minimal ComfyUI HTTP client (API format workflows): upload inputs, queue a
 * prompt, poll its history until done, download outputs, interrupt/cancel.
 */
export class ComfyUIClient {
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;
  readonly clientId = randomUUID();

  constructor(private readonly opts: ComfyClientOptions) {
    this.base = assertInternalEndpoint(opts.baseUrl, !!opts.apiKey, "ComfyUI").toString().replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { ...(this.opts.apiKey ? { Authorization: `Bearer ${this.opts.apiKey}` } : {}), ...extra };
  }

  private async call(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(this.opts.timeoutMs, 60_000));
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await this.fetchImpl(`${this.base}${path}`, { ...init, headers: this.headers((init.headers as Record<string, string>) ?? {}), signal: ctrl.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new LocalAiError(`ComfyUI ${path} → HTTP ${res.status}: ${body.slice(0, 300)}`, res.status >= 500 || res.status === 429, res.status === 400 ? "REJECTED" : "UNAVAILABLE");
      }
      return res;
    } catch (e) {
      if (e instanceof LocalAiError) throw e;
      if (signal?.aborted) throw new LocalAiError("Cancelled", false, "CANCELLED");
      throw new LocalAiError(`ComfyUI unreachable: ${(e as Error).message}`, true, "UNAVAILABLE");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  async health(): Promise<{ ok: boolean; devices?: unknown }> {
    try {
      const res = await this.call("/system_stats");
      const json = (await res.json()) as { devices?: unknown };
      return { ok: true, devices: json.devices };
    } catch {
      return { ok: false };
    }
  }

  async uploadImage(data: Buffer, name: string, signal?: AbortSignal): Promise<string> {
    const form = new FormData();
    form.append("image", new Blob([new Uint8Array(data)], { type: "image/png" }), name);
    form.append("overwrite", "true");
    const res = await this.call("/upload/image", { method: "POST", body: form }, signal);
    const json = (await res.json()) as { name: string; subfolder?: string };
    return json.subfolder ? `${json.subfolder}/${json.name}` : json.name;
  }

  async queuePrompt(workflow: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
    const res = await this.call("/prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: workflow, client_id: this.clientId }) }, signal);
    const json = (await res.json()) as { prompt_id?: string; error?: unknown; node_errors?: unknown };
    if (!json.prompt_id) throw new LocalAiError(`ComfyUI rejected the workflow: ${JSON.stringify(json.error ?? json.node_errors).slice(0, 400)}`, false, "REJECTED");
    return json.prompt_id;
  }

  /** Polls /history until the prompt finishes; returns its output images (all SaveImage nodes). */
  async waitForOutputs(promptId: string, signal?: AbortSignal, onProgress?: (p: number) => void): Promise<ComfyOutputImage[]> {
    const deadline = Date.now() + this.opts.timeoutMs;
    const interval = this.opts.pollIntervalMs ?? 1000;
    let polls = 0;
    while (Date.now() < deadline) {
      if (signal?.aborted) {
        await this.cancel(promptId).catch(() => undefined);
        throw new LocalAiError("Cancelled", false, "CANCELLED");
      }
      const res = await this.call(`/history/${encodeURIComponent(promptId)}`, {}, signal);
      const json = (await res.json()) as Record<string, { status?: { status_str?: string; completed?: boolean; messages?: unknown[] }; outputs?: Record<string, { images?: ComfyOutputImage[] }> }>;
      const entry = json[promptId];
      if (entry) {
        if (entry.status?.status_str === "error") throw new LocalAiError(`ComfyUI execution failed: ${JSON.stringify(entry.status.messages ?? []).slice(0, 400)}`, false, "BAD_RESPONSE");
        if (entry.status?.completed !== false && entry.outputs) {
          const images = Object.keys(entry.outputs)
            .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b))
            .flatMap((k) => entry.outputs![k].images ?? [])
            .filter((i) => i.type === "output");
          if (images.length) return images;
          throw new LocalAiError("ComfyUI finished without output images", false, "BAD_RESPONSE");
        }
      }
      polls++;
      onProgress?.(Math.min(95, 5 + polls * 2));
      await new Promise((r) => setTimeout(r, interval));
    }
    await this.cancel(promptId).catch(() => undefined);
    throw new LocalAiError(`ComfyUI job ${promptId} timed out after ${this.opts.timeoutMs} ms`, true, "TIMEOUT");
  }

  async download(img: ComfyOutputImage, signal?: AbortSignal): Promise<Buffer> {
    const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? "", type: img.type ?? "output" });
    const res = await this.call(`/view?${q.toString()}`, {}, signal);
    return Buffer.from(await res.arrayBuffer());
  }

  /** Removes a queued prompt, and interrupts it if it is the one running. */
  async cancel(promptId: string): Promise<void> {
    await this.call("/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ delete: [promptId] }) }).catch(() => undefined);
    const q = await this.call("/queue").then((r) => r.json() as Promise<{ queue_running?: unknown[][] }>).catch(() => ({ queue_running: [] as unknown[][] }));
    if ((q.queue_running ?? []).some((item) => Array.isArray(item) && item[1] === promptId)) await this.call("/interrupt", { method: "POST" }).catch(() => undefined);
  }
}
