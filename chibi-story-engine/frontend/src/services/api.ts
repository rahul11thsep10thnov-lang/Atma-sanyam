/** Thin client for the engine API. Every failure becomes an ApiError with the server's message. */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }

  /** The server's list of problems, when it sent one. */
  issues(): string[] {
    const list = (this.details.issues ?? this.details.awaiting ?? []) as unknown[];
    return list.map((i) => (typeof i === "string" ? i : `${(i as { path?: string }).path ?? ""}: ${(i as { message?: string }).message ?? ""}`));
  }
}

const TOKEN_KEY = "csae.token";

export const auth = {
  token: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(method: string, path: string, body?: unknown, form?: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = auth.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError(0, "network", "The server could not be reached");
  }
  if (response.status === 401 && token) {
    auth.clear();
    window.dispatchEvent(new Event("csae:signed-out"));
  }
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const err = data?.error ?? {};
    throw new ApiError(response.status, err.code ?? "error", err.message ?? `Request failed (${response.status})`, err.details ?? {});
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  upload: <T>(path: string, form: FormData) => request<T>("POST", path, undefined, form),
};

/** Media URLs need the token in the query string because <img>, <audio> and <video> cannot send headers. */
export function media(url: string | null | undefined): string {
  if (!url) return "";
  const token = auth.token();
  return token ? `${url}${url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}` : url;
}
