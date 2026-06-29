import { getAdmin, extractBearerToken, getSession } from "../_lib/auth.js";
import { ok } from "../_lib/response.js";
import type { ApiRequest, ApiResponse } from "../_lib/types.js";

/**
 * GET /api/auth/me
 * Returns the current session + whether admin has been initialized.
 * Public endpoint (used by the frontend before login to decide /setup vs /login).
 *
 * Response when no admin yet:
 *   { setupRequired: true, authenticated: false }
 *
 * Response when admin exists but no/invalid token:
 *   { setupRequired: false, authenticated: false, username: null }
 *
 * Response when authenticated:
 *   { setupRequired: false, authenticated: true, username: "..." }
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const admin = await getAdmin();

  if (!admin) {
    return ok(res, { setupRequired: true, authenticated: false, username: null });
  }

  const token = extractBearerToken(req.headers ?? {});
  const session = token ? await getSession(token) : null;

  if (!session) {
    return ok(res, {
      setupRequired: false,
      authenticated: false,
      username: null,
    });
  }

  return ok(res, {
    setupRequired: false,
    authenticated: true,
    username: session.username,
  });
}
