import { requireAuth } from "../_lib/middleware";
import { ok, error } from "../_lib/response";
import { cfFetch } from "../_lib/cloudflare";
import type { ApiResponse } from "../_lib/types";
import type { AuthedRequest } from "../_lib/middleware";
import { getBody } from "../_lib/http";

interface CfZone {
  id: string;
  name: string;
  status: string;
}

/**
 * POST /api/providers/verify
 * Verify a Cloudflare API token and return the zones it can access, without
 * persisting anything. Used by the Add Provider flow to let the user pick
 * zones before saving.
 *
 * Body: { type: "cloudflare", apiKey }
 */
async function verify(req: AuthedRequest, res: ApiResponse) {
  const body = getBody(req) as { type?: string; apiKey?: string };
  const type = body.type;
  const apiKey = body.apiKey?.trim();

  if (type !== "cloudflare") {
    return error(res, "Only 'cloudflare' provider type is supported in this MVP");
  }
  if (!apiKey) return error(res, "API key is required");

  try {
    await cfFetch<{ id: string; status: string }>(apiKey, "/user/tokens/verify");
  } catch (e) {
    return error(res, `Cloudflare token verification failed: ${e instanceof Error ? e.message : "unknown error"}`, 422);
  }

  try {
    const result = await cfFetch<CfZone[]>(apiKey, "/zones", { query: { per_page: 50 } });
    const zones = (Array.isArray(result) ? result : []).map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
    }));
    return ok(res, zones);
  } catch (e) {
    return error(res, `Failed to fetch zones: ${e instanceof Error ? e.message : "unknown error"}`, 502);
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === "POST") return verify(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
