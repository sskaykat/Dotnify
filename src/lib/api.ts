import { clearToken, getToken } from "./token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  /** Skip auth header (for /login, /setup, /me). */
  noAuth?: boolean;
  /** Treat 401 as a non-throwing signal (caller handles). */
  allow401?: boolean;
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!opts.noAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      // non-JSON body
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      if (opts.allow401) {
        // signal to caller
      } else {
        // bounce to /login if we're in the browser
        if (typeof window !== "undefined" && window.location.pathname !== "/login" && window.location.pathname !== "/setup") {
          window.location.assign("/login");
        }
      }
    }
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  const data = (payload as { data?: T })?.data;
  return (data ?? payload) as T;
}
