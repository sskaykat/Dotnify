import { destroySession, extractBearerToken } from "../_lib/auth.js";
import { error, ok } from "../_lib/response.js";
import type { ApiRequest, ApiResponse } from "../_lib/types.js";

/**
 * POST /api/auth/logout
 * Invalidates the current Bearer token in Redis.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return error(res, "Method not allowed", 405);

  const token = extractBearerToken(req.headers ?? {});
  if (!token) return ok(res, { loggedOut: true }); // idempotent

  await destroySession(token);
  return ok(res, { loggedOut: true });
}
