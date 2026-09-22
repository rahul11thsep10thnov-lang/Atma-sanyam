import "server-only";

/**
 * Server-only fetch wrapper for the FastAPI backend. BACKEND_API_URL and
 * BACKEND_API_TOKEN are read from process.env here and NOWHERE else in the
 * frontend — never passed to a Client Component, never prefixed
 * NEXT_PUBLIC_ (build spec: API keys/credentials must remain server-side).
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000/api";
const BACKEND_API_TOKEN = process.env.BACKEND_API_TOKEN || "";

export class BackendError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function backendFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${BACKEND_API_TOKEN}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let code = "UNKNOWN_ERROR";
    let message = `Backend request failed with status ${res.status}.`;
    try {
      const body = await res.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? message;
    } catch {
      // response body wasn't JSON — keep the generic message.
    }
    throw new BackendError(code, message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
