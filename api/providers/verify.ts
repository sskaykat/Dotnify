import { requireAuth } from "../_lib/middleware";
import { ok, error } from "../_lib/response";
import { cfFetch } from "../_lib/cloudflare";
import { listZones as hwListZones } from "../_lib/huawei";
import type { ApiResponse, Zone } from "../_lib/types";
import type { AuthedRequest } from "../_lib/middleware";
import { getBody } from "../_lib/http";

interface CfZone {
  id: string;
  name: string;
  status: string;
}

/**
 * POST /api/providers/verify
 * Verify a provider's credentials and return the zones it can access, without
 * persisting anything. Used by the Add Provider flow to let the user pick
 * zones before saving.
 */
async function verify(req: AuthedRequest, res: ApiResponse) {
  const body = getBody(req) as {
    type?: string;
    apiKey?: string;
    apiAccessKey?: string;
    apiSecretKey?: string;
    region?: string;
  };
  const type = body.type;
  const apiKey = body.apiKey?.trim();
  const apiAccessKey = body.apiAccessKey?.trim();
  const apiSecretKey = body.apiSecretKey?.trim();
  const region = body.region?.trim();

  if (type === "cloudflare") {
    if (!apiKey) return error(res, "API key is required");

    try {
      await cfFetch<{ id: string; status: string }>(apiKey, "/user/tokens/verify");
    } catch (e) {
      return error(res, `Cloudflare token verification failed: ${e instanceof Error ? e.message : "unknown error"}`, 422);
    }

    try {
      const result = await cfFetch<CfZone[]>(apiKey, "/zones", { query: { per_page: 50 } });
      const zones: Zone[] = (Array.isArray(result) ? result : []).map((z) => ({
        id: z.id,
        name: z.name,
        status: z.status,
      }));
      return ok(res, zones);
    } catch (e) {
      return error(res, `Failed to fetch zones: ${e instanceof Error ? e.message : "unknown error"}`, 502);
    }
  }

  if (type === "huawei") {
    if (!apiAccessKey) return error(res, "Access Key ID is required");
    if (!apiSecretKey) return error(res, "Secret Access Key is required");

    try {
      const zones = await hwListZones(apiAccessKey, apiSecretKey, region || undefined);
      return ok(res, zones);
    } catch (e) {
      return error(res, `Huawei Cloud verification failed: ${e instanceof Error ? e.message : "unknown error"}`, 422);
    }
  }

  return error(res, "Only 'cloudflare' and 'huawei' provider types are supported");
}

export default requireAuth(async (req, res) => {
  if (req.method === "POST") return verify(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
