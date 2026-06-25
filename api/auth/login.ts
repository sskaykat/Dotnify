import { createSession, getAdmin, verifyPassword } from "../_lib/auth";
import { error, ok, unauthorized } from "../_lib/response";
import type { ApiRequest, ApiResponse } from "../_lib/types";

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, username }
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return error(res, "Method not allowed", 405);

  const body = (req.body ?? {}) as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return unauthorized(res, "Username and password required");
  }

  const admin = await getAdmin();
  if (!admin) {
    return unauthorized(res, "Admin not initialized");
  }

  if (admin.username !== username) {
    return unauthorized(res, "Invalid credentials");
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return unauthorized(res, "Invalid credentials");
  }

  const token = await createSession(admin.username);
  return ok(res, { token, username: admin.username });
}
