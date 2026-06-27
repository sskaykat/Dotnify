import { randomBytes } from "node:crypto";
import { requireAuth } from "../_lib/middleware";
import { redis, KEYS } from "../_lib/redis";
import { ok, error } from "../_lib/response";
import { cfFetch } from "../_lib/cloudflare";
import { listZones as hwListZones } from "../_lib/huawei";
import type { ApiResponse, Provider } from "../_lib/types";
import type { AuthedRequest } from "../_lib/middleware";
import { getBody } from "../_lib/http";

interface CfZone {
  id: string;
  name: string;
  status: string;
}

function maskStr(k: string): string {
  return k.length <= 4 ? "****" : `${"*".repeat(Math.min(8, k.length - 4))}${k.slice(-4)}`;
}

/**
 * GET /api/providers
 * List all configured providers. API keys are masked before being sent to the
 * client (only the last 4 chars are visible).
 */
async function list(_req: AuthedRequest, res: ApiResponse) {
  const raw = (await redis.get<Provider[]>(KEYS.providers)) ?? [];
  const providers = Array.isArray(raw) ? raw : [];
  const masked = providers.map(maskKey);
  return ok(res, masked);
}

/**
 * POST /api/providers
 * Add a new provider. Verifies the credentials, then fetches the zone
 * list so the caller can pick which zones to manage.
 */
async function create(req: AuthedRequest, res: ApiResponse) {
  const body = getBody(req) as {
    type?: string;
    name?: string;
    apiKey?: string;
    apiAccessKey?: string;
    apiSecretKey?: string;
    region?: string;
    selectedZones?: string[];
  };
  const type = body.type;
  const name = body.name?.trim();
  const apiKey = body.apiKey?.trim();
  const apiAccessKey = body.apiAccessKey?.trim();
  const apiSecretKey = body.apiSecretKey?.trim();
  const region = body.region?.trim();
  const selectedZones = Array.isArray(body.selectedZones) ? body.selectedZones : [];

  if (type !== "cloudflare" && type !== "huawei") {
    return error(res, "Only 'cloudflare' and 'huawei' provider types are supported");
  }
  if (!name) return error(res, "Name is required");

  if (type === "cloudflare") {
    if (!apiKey) return error(res, "API key is required");

    // Verify the token by calling Cloudflare's token-verify endpoint.
    try {
      await cfFetch<{ id: string; status: string }>(apiKey, "/user/tokens/verify");
    } catch (e) {
      return error(res, `Cloudflare token verification failed: ${e instanceof Error ? e.message : "unknown error"}`, 422);
    }

    // Validate selectedZones against the token's accessible zones (if any were picked).
    if (selectedZones.length > 0) {
      let accessible: CfZone[] = [];
      try {
        accessible = await cfFetch<CfZone[]>(apiKey, "/zones", { query: { per_page: 50 } });
      } catch (e) {
        return error(res, `Failed to fetch zones for validation: ${e instanceof Error ? e.message : "unknown error"}`, 502);
      }
      const validIds = new Set(accessible.map((z) => z.id));
      const invalid = selectedZones.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        return error(res, `Some selected zones are not accessible with this token: ${invalid.join(", ")}`, 422);
      }
    }
  } else {
    // Huawei Cloud
    if (!apiAccessKey) return error(res, "Access Key ID is required");
    if (!apiSecretKey) return error(res, "Secret Access Key is required");

    // Verify by listing zones (will throw on auth failure).
    try {
      const zones = await hwListZones(apiAccessKey, apiSecretKey, region || undefined);
      // Validate selectedZones
      if (selectedZones.length > 0) {
        const validIds = new Set(zones.map((z) => z.id));
        const invalid = selectedZones.filter((id) => !validIds.has(id));
        if (invalid.length > 0) {
          return error(res, `Some selected zones are not accessible: ${invalid.join(", ")}`, 422);
        }
      }
    } catch (e) {
      return error(res, `Huawei Cloud verification failed: ${e instanceof Error ? e.message : "unknown error"}`, 422);
    }
  }

  const provider: Provider = {
    id: randomBytes(8).toString("hex"),
    type: type as Provider["type"],
    name,
    apiKey: type === "cloudflare" ? apiKey! : "",
    ...(type === "huawei" ? { apiAccessKey, apiSecretKey, region } : {}),
    createdAt: new Date().toISOString(),
    selectedZones,
  };

  const existing = (await redis.get<Provider[]>(KEYS.providers)) ?? [];
  const list = Array.isArray(existing) ? existing : [];
  list.push(provider);
  await redis.set(KEYS.providers, JSON.stringify(list));

  return ok(res, maskKey(provider), 201);
}

function maskKey(p: Provider): Provider {
  const masked: Provider = {
    ...p,
    apiKey: p.apiKey ? maskStr(p.apiKey) : "",
    selectedZones: Array.isArray(p.selectedZones) ? p.selectedZones : [],
  };
  if (p.apiAccessKey) masked.apiAccessKey = maskStr(p.apiAccessKey);
  if (p.apiSecretKey) masked.apiSecretKey = maskStr(p.apiSecretKey);
  return masked;
}

export default requireAuth(async (req, res) => {
  if (req.method === "GET") return list(req as AuthedRequest, res);
  if (req.method === "POST") return create(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
