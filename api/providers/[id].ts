import { requireAuth } from "../_lib/middleware.js";
import { redis, KEYS } from "../_lib/redis.js";
import { ok, error, notFound } from "../_lib/response.js";
import { getBody, queryStr } from "../_lib/http.js";
import { cfFetch } from "../_lib/cloudflare.js";
import { listZones as hwListZones } from "../_lib/huawei.js";
import type { ApiResponse, Provider } from "../_lib/types.js";
import type { AuthedRequest } from "../_lib/middleware.js";

async function loadProviders(): Promise<Provider[]> {
  const raw = (await redis.get<Provider[]>(KEYS.providers)) ?? [];
  return Array.isArray(raw) ? raw : [];
}

async function saveProviders(list: Provider[]): Promise<void> {
  await redis.set(KEYS.providers, JSON.stringify(list));
}

function maskStr(k: string): string {
  return k.length <= 4 ? "****" : `${"*".repeat(Math.min(8, k.length - 4))}${k.slice(-4)}`;
}

function maskKey(p: Provider): Provider {
  const masked: Provider = { ...p, apiKey: p.apiKey ? maskStr(p.apiKey) : "" };
  if (p.apiAccessKey) masked.apiAccessKey = maskStr(p.apiAccessKey);
  if (p.apiSecretKey) masked.apiSecretKey = maskStr(p.apiSecretKey);
  return masked;
}

/**
 * PATCH /api/providers/:id
 * Update name and/or credentials. If credentials change we re-verify before persisting.
 */
async function update(req: AuthedRequest, res: ApiResponse) {
  const id = queryStr(req, "id");
  const body = getBody(req) as {
    name?: string;
    apiKey?: string;
    apiAccessKey?: string;
    apiSecretKey?: string;
    region?: string;
    selectedZones?: string[];
  };

  const list = await loadProviders();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return notFound(res, "Provider not found");

  const provider = list[idx];
  const newName = body.name?.trim();

  if (newName) provider.name = newName;

  if (provider.type === "cloudflare") {
    const newKey = body.apiKey?.trim();
    if (newKey && newKey !== provider.apiKey) {
      try {
        await cfFetch<{ id: string; status: string }>(newKey, "/user/tokens/verify");
      } catch (e) {
        return error(res, `Cloudflare token verification failed: ${e instanceof Error ? e.message : "unknown error"}`, 422);
      }
      provider.apiKey = newKey;
    }
  } else if (provider.type === "huawei") {
    const newAk = body.apiAccessKey?.trim();
    const newSk = body.apiSecretKey?.trim();
    const newRegion = body.region?.trim();
    const credsChanged =
      (newAk && newAk !== provider.apiAccessKey) ||
      (newSk && newSk !== provider.apiSecretKey) ||
      (newRegion && newRegion !== provider.region);

    if (credsChanged) {
      const ak = newAk || provider.apiAccessKey || "";
      const sk = newSk || provider.apiSecretKey || "";
      const reg = newRegion || provider.region;
      try {
        await hwListZones(ak, sk, reg || undefined);
      } catch (e) {
        return error(res, `Huawei Cloud verification failed: ${e instanceof Error ? e.message : "unknown error"}`, 422);
      }
      if (newAk) provider.apiAccessKey = newAk;
      if (newSk) provider.apiSecretKey = newSk;
      if (newRegion) provider.region = newRegion;
    }
  }

  if (Array.isArray(body.selectedZones)) {
    provider.selectedZones = body.selectedZones;
  }

  list[idx] = provider;
  await saveProviders(list);
  return ok(res, maskKey(provider));
}

/**
 * DELETE /api/providers/:id
 * Remove a provider from the list.
 */
async function remove(req: AuthedRequest, res: ApiResponse) {
  const id = queryStr(req, "id");
  const list = await loadProviders();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return notFound(res, "Provider not found");

  list.splice(idx, 1);
  await saveProviders(list);
  return ok(res, { deleted: true });
}

export default requireAuth(async (req, res) => {
  if (req.method === "PATCH") return update(req as AuthedRequest, res);
  if (req.method === "DELETE") return remove(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
