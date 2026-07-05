import { createMiddleware } from "hono/factory";
import { getSession, extractBearerToken, refreshSessionTTL } from "./auth.js";
import { unauthorized } from "./response.js";
import type { AuthedVariables } from "./types.js";

/**
 * Hono middleware that validates the Bearer token against Redis and
 * attaches the session + token to the context. Responds 401 if missing/invalid.
 *
 * On every successful auth the session TTL is refreshed (sliding expiration),
 * so active users stay logged in as long as they use the app within the
 * idle window (see refreshSessionTTL for details).
 */
export const requireAuth = createMiddleware<{ Variables: AuthedVariables }>(async (c, next) => {
  const token = extractBearerToken(c.req.header("authorization"));
  if (!token) return unauthorized(c, "Missing or invalid Authorization header");
  const session = await getSession(token);
  if (!session) return unauthorized(c, "Session expired or invalid");

  // Sliding expiration: refresh TTL if it's getting low
  await refreshSessionTTL(token);

  c.set("session", session);
  c.set("token", token);
  await next();
});
