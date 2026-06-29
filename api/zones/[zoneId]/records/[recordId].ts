import { requireAuth } from "../../../_lib/middleware.js";
import { redis, KEYS } from "../../../_lib/redis.js";
import { ok, error, notFound } from "../../../_lib/response.js";
import { getBody, queryStr } from "../../../_lib/http.js";
import { cfFetch } from "../../../_lib/cloudflare.js";
import {
  updateRecordSet as hwUpdateRecordSet,
  deleteRecordSet as hwDeleteRecordSet,
  listRecordSets,
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
 * PATCH /api/zones/:zoneId/records/:recordId?providerId=...
 * Body: partial record fields to update.
 */
async function update(req: AuthedRequest, res: ApiResponse) {
  const zoneId = queryStr(req, "zoneId");
  const recordId = queryStr(req, "recordId");
  const zoneName = queryStr(req, "zoneName") ?? "";
  const provider = await findProvider(queryStr(req, "providerId"));
  if (!provider) return notFound(res, "Provider not found");
  if (!zoneId || !recordId) return error(res, "zoneId and recordId are required");

  const body = getBody(req) as Partial<DnsRecord>;

  try {
    if (provider.type === "cloudflare") {
      const payload: Record<string, unknown> = {};
      if (body.type !== undefined) payload.type = body.type;
      if (body.name !== undefined) payload.name = body.name;
      if (body.content !== undefined) payload.content = body.content;
      if (body.ttl !== undefined) payload.ttl = body.ttl;
      if (body.proxied !== undefined) payload.proxied = body.proxied;
      if (body.priority !== undefined) payload.priority = body.priority;

      if (Object.keys(payload).length === 0) {
        return error(res, "No fields to update");
      }

      const result = await cfFetch<CfRecord>(
        provider.apiKey,
        `/zones/${zoneId}/dns_records/${recordId}`,
        { method: "PATCH", body: payload }
      );
      return ok(res, normalizeCf(result));
    }

    if (provider.type === "huawei") {
      const ak = provider.apiAccessKey ?? "";
      const sk = provider.apiSecretKey ?? "";
      const reg = provider.region;

      // Huawei Cloud UpdateRecordSet requires the full records array.
      // Fetch the current recordset to get the existing records, then apply changes.
      const existingSets = await listRecordSets(ak, sk, reg, zoneId);
      const existing = existingSets.find((rs) => rs.id === recordId);
      if (!existing) return notFound(res, "Record not found");

      const records = body.content !== undefined
        ? (body.content.includes(", ") ? body.content.split(", ") : [body.content])
        : existing.records;

      const rs = await hwUpdateRecordSet(ak, sk, reg, zoneId, recordId, zoneName, {
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        ttl: body.ttl ?? existing.ttl,
        records,
        line: body.line ?? existing.line,
      });
      return ok(res, normalizeHw(rs, zoneName));
    }

    return error(res, `Unsupported provider type: ${provider.type}`, 400);
  } catch (e) {
    return error(res, `Failed to update record: ${e instanceof Error ? e.message : "unknown error"}`, 502);
  }
}

/**
 * DELETE /api/zones/:zoneId/records/:recordId?providerId=...
 */
async function remove(req: AuthedRequest, res: ApiResponse) {
  const zoneId = queryStr(req, "zoneId");
  const recordId = queryStr(req, "recordId");
  const provider = await findProvider(queryStr(req, "providerId"));
  if (!provider) return notFound(res, "Provider not found");
  if (!zoneId || !recordId) return error(res, "zoneId and recordId are required");

  try {
    if (provider.type === "cloudflare") {
      await cfFetch<{ id: string }>(
        provider.apiKey,
        `/zones/${zoneId}/dns_records/${recordId}`,
        { method: "DELETE" }
      );
      return ok(res, { deleted: true });
    }

    if (provider.type === "huawei") {
      await hwDeleteRecordSet(
        provider.apiAccessKey ?? "",
        provider.apiSecretKey ?? "",
        provider.region,
        zoneId,
        recordId
      );
      return ok(res, { deleted: true });
    }

    return error(res, `Unsupported provider type: ${provider.type}`, 400);
  } catch (e) {
    return error(res, `Failed to delete record: ${e instanceof Error ? e.message : "unknown error"}`, 502);
  }
}

export default requireAuth(async (req, res) => {
  if (req.method === "PATCH") return update(req as AuthedRequest, res);
  if (req.method === "DELETE") return remove(req as AuthedRequest, res);
  return error(res, "Method not allowed", 405);
});
