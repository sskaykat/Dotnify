import { getAdmin, hashPassword, setAdmin } from "../_lib/auth";
import { error, ok } from "../_lib/response";
import type { ApiRequest, ApiResponse, Admin } from "../_lib/types";

/**
 * POST /api/auth/setup
 * First-time admin creation. Only available when no admin exists yet.
 * Body: { username, password }
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") return error(res, "Method not allowed", 405);

  const existing = await getAdmin();
  if (existing) {
    return error(res, "Admin already initialized", 409);
  }

  const body = (req.body ?? {}) as { username?: string; password?: string };
  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username || username.length < 3) {
    return error(res, "Username must be at least 3 characters");
  }
  if (password.length < 8) {
    return error(res, "Password must be at least 8 characters");
  }

  const passwordHash = await hashPassword(password);
  const admin: Admin = {
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  await setAdmin(admin);

  return ok(res, { username, createdAt: admin.createdAt }, 201);
}
