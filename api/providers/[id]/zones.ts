import { requireAuth } from "../../_lib/middleware.js";
import { redis, KEYS } from "../../_lib/redis.js";
import { ok, error, notFound } from "../../_lib/response.js";
import { queryStr } from "../../_lib/http.js";
import { cfFetch } from "../../_lib/cloudflare.js";
import { listZones as hwListZones } from "../../_lib/huawei.js";
import type { ApiResponse, Provider, Zone } from "../../_lib/types.js";
import type { AuthedRequest } from "../../_lib/middleware.js";

interface CfZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
}

/**
 * GET /api/providers/:id/zones
 * List zones accessible to this provider.
 */
async function list(req: AuthedRequest, res: ApiResponse) {
  const id = queryStr(req, "id");

  const raw = (await redis.get<Provider[]>(KEYS.providers)) ?? [];
  const providers = Array.isArray(raw) ? raw : [];
  const provider = providers.find((p) => p.id === id);
  if (!provider) return notFound(res, "Provider not found");

  try {
    if (provider.type === "cloudflare") {
      const result = await cfFetch<CfZone[]>(provider.apiKey, "/zones", {
        query: { per_page: 50 },
      });
      const zones: Zone[] = (Array.isArray(result) ? result : []).map((z) => ({
        id: z.id,
        name: z.name,
        status: z.status,
      }));
      return ok(res, zones);
    }

    if (provider.type === "huawei") {
      const zones = await hwListZones(
        provider.apiAccessKey ?? "",
        provider.apiSecretKey ?? "",
        provider.region
      );
      return ok(res, zones);
    }

    return error(res, `Unsupported provider type: ${provider.type}`, 400);
  } catch (e) {
    return error(res, `Failed to fetch zones: ${e instanceof Error ? e.message : "unknown error"}`, 502);
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === "GET") return list(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
