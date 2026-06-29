import { requireAuth } from "../_lib/middleware.js";
import { redis, KEYS } from "../_lib/redis.js";
import { ok, error } from "../_lib/response.js";
import { cfFetch } from "../_lib/cloudflare.js";
import { listZones as hwListZones } from "../_lib/huawei.js";
import type { ApiResponse, Provider, Zone } from "../_lib/types.js";
import type { AuthedRequest } from "../_lib/middleware.js";

interface CfZone {
  id: string;
  name: string;
  status: string;
}

interface ZoneWithProvider extends Zone {
  providerId: string;
  providerName: string;
  providerType: Provider["type"];
}

/**
 * GET /api/zones
 * Aggregate zones from every configured provider, filtered by each provider's
 * `selectedZones` list. Returns a flat list sorted by zone name.
 */
async function list(_req: AuthedRequest, res: ApiResponse) {
  const raw = (await redis.get<Provider[]>(KEYS.providers)) ?? [];
  const providers = Array.isArray(raw) ? raw : [];

  const errors: { providerId: string; providerName: string; message: string }[] = [];
  const all: ZoneWithProvider[] = [];

  await Promise.all(
    providers.map(async (p) => {
      try {
        let zones: Zone[] = [];

        if (p.type === "cloudflare") {
          const result = await cfFetch<CfZone[]>(p.apiKey, "/zones", { query: { per_page: 50 } });
          const cfZones = Array.isArray(result) ? result : [];
          zones = cfZones.map((z) => ({ id: z.id, name: z.name, status: z.status }));
        } else if (p.type === "huawei") {
          zones = await hwListZones(
            p.apiAccessKey ?? "",
            p.apiSecretKey ?? "",
            p.region
          );
        }

        const selected = Array.isArray(p.selectedZones) ? p.selectedZones : [];
        const allow = selected.length > 0 ? new Set(selected) : null;
        for (const z of zones) {
          if (allow && !allow.has(z.id)) continue;
          all.push({
            id: z.id,
            name: z.name,
            status: z.status,
            providerId: p.id,
            providerName: p.name,
            providerType: p.type,
          });
        }
      } catch (e) {
        errors.push({
          providerId: p.id,
          providerName: p.name,
          message: e instanceof Error ? e.message : "unknown error",
        });
      }
    })
  );

  all.sort((a, b) => a.name.localeCompare(b.name));
  return ok(res, { zones: all, errors });
}

export default requireAuth(async (req, res) => {
  if (req.method === "GET") return list(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
