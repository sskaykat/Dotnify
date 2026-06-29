import { requireAuth } from "../../../_lib/middleware.js";
import { redis, KEYS } from "../../../_lib/redis.js";
import { ok, error, notFound } from "../../../_lib/response.js";
import { getBody, queryStr } from "../../../_lib/http.js";
import { cfFetch } from "../../../_lib/cloudflare.js";
import {
  listRecordSets,
  createRecordSet as hwCreateRecordSet,
  stripHost,
} from "../../../_lib/huawei.js";
import type { ApiResponse, Provider, DnsRecord } from "../../../_lib/types.js";
import type { AuthedRequest } from "../../../_lib/middleware.js";

async function findProvider(providerId: string | undefined): Promise<Provider | null> {
  if (!providerId) return null;
  const raw = (await redis.get<Provider[]>(KEYS.providers)) ?? [];
  const providers = Array.isArray(raw) ? raw : [];
  return providers.find((p) => p.id === providerId) ?? null;
}

interface CfRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
  comment?: string | { content?: string };
}

function normalizeCf(r: CfRecord): DnsRecord {
  const comment =
    typeof r.comment === "string"
      ? r.comment
      : r.comment && typeof r.comment === "object" && "content" in r.comment
        ? r.comment.content ?? ""
        : undefined;
  return {
    id: r.id,
    type: r.type as DnsRecord["type"],
    name: r.name,
    content: r.content,
    ttl: r.ttl,
    proxied: r.proxied,
    priority: r.priority,
    comment,
  };
}

function normalizeHw(rs: { id: string; name: string; type: string; ttl: number; records: string[]; line?: string }, zoneName: string): DnsRecord {
  return {
    id: rs.id,
    type: rs.type as DnsRecord["type"],
    name: stripHost(rs.name, zoneName),
    content: rs.records.length > 1 ? rs.records.join(", ") : (rs.records[0] ?? ""),
    ttl: rs.ttl,
    line: rs.line,
  };
}

/**
 * GET /api/zones/:zoneId/records?providerId=...
 */
async function list(req: AuthedRequest, res: ApiResponse) {
  const zoneId = queryStr(req, "zoneId");
  const zoneName = queryStr(req, "zoneName") ?? "";
  const provider = await findProvider(queryStr(req, "providerId"));
  if (!provider) return notFound(res, "Provider not found");
  if (!zoneId) return error(res, "zoneId is required");

  try {
    if (provider.type === "cloudflare") {
      const result = await cfFetch<CfRecord[]>(
        provider.apiKey,
        `/zones/${zoneId}/dns_records`,
        { query: { per_page: 100 } }
      );
      const records = (Array.isArray(result) ? result : []).map(normalizeCf);
      return ok(res, records);
    }

    if (provider.type === "huawei") {
      const recordSets = await listRecordSets(
        provider.apiAccessKey ?? "",
        provider.apiSecretKey ?? "",
        provider.region,
        zoneId
      );
      const records = recordSets.map((rs) => normalizeHw(rs, zoneName));
      return ok(res, records);
    }

    return error(res, `Unsupported provider type: ${provider.type}`, 400);
  } catch (e) {
    return error(res, `Failed to fetch records: ${e instanceof Error ? e.message : "unknown error"}`, 502);
  }
}

/**
 * POST /api/zones/:zoneId/records?providerId=...
 * Body: { type, name, content, ttl, proxied?, priority? }
 */
async function create(req: AuthedRequest, res: ApiResponse) {
  const zoneId = queryStr(req, "zoneId");
  const zoneName = queryStr(req, "zoneName") ?? "";
  const provider = await findProvider(queryStr(req, "providerId"));
  if (!provider) return notFound(res, "Provider not found");
  if (!zoneId) return error(res, "zoneId is required");

  const body = getBody(req) as Partial<DnsRecord>;
  if (!body.type || !body.name || body.content === undefined) {
    return error(res, "type, name and content are required");
  }

  try {
    if (provider.type === "cloudflare") {
      const payload: Record<string, unknown> = {
        type: body.type,
        name: body.name,
        content: body.content,
        ttl: body.ttl ?? 1, // 1 = auto
      };
      if (body.proxied !== undefined) payload.proxied = body.proxied;
      if (body.priority !== undefined) payload.priority = body.priority;

      const result = await cfFetch<CfRecord>(
        provider.apiKey,
        `/zones/${zoneId}/dns_records`,
        { method: "POST", body: payload }
      );
      return ok(res, normalizeCf(result), 201);
    }

    if (provider.type === "huawei") {
      // Huawei Cloud RecordSet: records is an array of strings
      const records = body.content.includes(", ")
        ? body.content.split(", ")
        : [body.content];
      const rs = await hwCreateRecordSet(
        provider.apiAccessKey ?? "",
        provider.apiSecretKey ?? "",
        provider.region,
        zoneId,
        zoneName,
        {
          name: body.name,
          type: body.type,
          ttl: body.ttl ?? 300,
          records,
          line: body.line,
        }
      );
      return ok(res, normalizeHw(rs, zoneName), 201);
    }

    return error(res, `Unsupported provider type: ${provider.type}`, 400);
  } catch (e) {
    return error(res, `Failed to create record: ${e instanceof Error ? e.message : "unknown error"}`, 502);
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === "GET") return list(req as AuthedRequest, res);
  if (req.method === "POST") return create(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
