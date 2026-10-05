import { isIP } from "node:net";
import { LocalAiError } from "./types";

/**
 * GPU inference endpoints must stay on the internal network. A base URL that
 * points at a public host is refused unless it is HTTPS *and* an API key is
 * configured (i.e. it sits behind an authenticating gateway). This is a guard
 * against accidentally sending jobs to an open, unauthenticated GPU box.
 */
export function assertInternalEndpoint(baseUrl: string, hasApiKey: boolean, what: string): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new LocalAiError(`${what}: invalid base URL`, false, "CONFIG");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new LocalAiError(`${what}: unsupported protocol ${url.protocol}`, false, "CONFIG");
  if (url.username || url.password) throw new LocalAiError(`${what}: credentials must not be embedded in the URL; use the API key variable`, false, "CONFIG");
  if (isPrivateHost(url.hostname)) return url;
  if (url.protocol === "https:" && hasApiKey) return url;
  throw new LocalAiError(`${what}: ${url.hostname} is not an internal host. Public endpoints require HTTPS and an API key.`, false, "CONFIG");
}

export function isPrivateHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".svc") || h.endsWith(".cluster.local")) return true;
  // Single-label names (docker-compose service names such as "comfyui") resolve on the private network.
  if (!h.includes(".") && isIP(h) === 0) return true;
  if (isIP(h) === 4) {
    const [a, b] = h.split(".").map(Number);
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (isIP(h) === 6) return h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80");
  return false;
}
