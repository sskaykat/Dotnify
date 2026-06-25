import type { ApiResponse } from "./types";

/**
 * Thin helpers around the response object so every API route returns a consistent
 * JSON envelope. Keeps route handlers tiny and free of response-shaping boilerplate.
 */

export function ok<T>(res: ApiResponse, data?: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function error(res: ApiResponse, message: string, status = 400) {
  return res.status(status).json({ ok: false, error: message });
}

export function unauthorized(res: ApiResponse, message = "Unauthorized") {
  return res.status(401).json({ ok: false, error: message });
}

export function notFound(res: ApiResponse, message = "Not found") {
  return res.status(404).json({ ok: false, error: message });
}
