import { createHmac, createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// DNSPod (Tencent Cloud DNS) API client — TC3-HMAC-SHA256 signing + fetch.
// ---------------------------------------------------------------------------

const ENDPOINT = "dnspod.tencentcloudapi.com";
const SERVICE = "dnspod";
const VERSION = "2021-03-23";
const ALGORITHM = "TC3-HMAC-SHA256";

function sha256Hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hmacSha256Hex(key: string | Buffer, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Generate TC3-HMAC-SHA256 Authorization header value.
 */
function generateSign(secretId: string, secretKey: string, payload: string, timestamp: number): string {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10); // YYYY-MM-DD UTC

  // Step 1: build canonical request string
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${ENDPOINT}\n`;
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = sha256Hex(payload);
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join("\n");

  // Step 2: build string to sign
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const hashedCanonicalRequest = sha256Hex(canonicalRequest);
  const stringToSign = [ALGORITHM, String(timestamp), credentialScope, hashedCanonicalRequest].join("\n");

  // Step 3: sign string
  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, SERVICE);
  const secretSigning = hmacSha256(secretService, "tc3_request");
  const signature = hmacSha256Hex(secretSigning, stringToSign);

  // Step 4: build authorization
  return `${ALGORITHM} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * Call the DNSPod API with TC3-HMAC-SHA256 signing.
 */
async function dpFetch<T>(
  secretId: string,
  secretKey: string,
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  // Filter null/undefined params
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) filtered[k] = v;
  }

  const payload = JSON.stringify(Object.keys(filtered).length > 0 ? filtered : {});
  const timestamp = Math.floor(Date.now() / 1000);
  const authorization = generateSign(secretId, secretKey, payload, timestamp);

  const headers: Record<string, string> = {
    Authorization: authorization,
    "Content-Type": "application/json; charset=utf-8",
    "X-TC-Action": action,
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Version": VERSION,
    Host: ENDPOINT,
  };

  const res = await fetch(`https://${ENDPOINT}/`, {
    method: "POST",
    headers,
    body: payload,
  });

  const text = await res.text();
  let json: { Response?: T & { Error?: { Code?: string; Message?: string } } } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON
  }

  if (json?.Response?.Error) {
    throw new Error(json.Response.Error.Message ?? `DNSPod API error: ${json.Response.Error.Code}`);
  }

  if (!json?.Response) {
    throw new Error(`DNSPod request failed (${res.status})`);
  }

  return json.Response as T;
}

// ---------------------------------------------------------------------------
// Type conversions
// ---------------------------------------------------------------------------

/** Convert frontend type to DNSPod API type. */
function toApiType(type: string): string {
  if (type === "REDIRECT_URL") return "显性URL";
  if (type === "FORWARD_URL") return "隐性URL";
  return type;
}

/** Convert DNSPod API type to frontend type. */
function fromApiType(type: string): string {
  if (type === "显性URL") return "REDIRECT_URL";
  if (type === "隐性URL") return "FORWARD_URL";
  return type;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface DpZone {
  id: string;
  name: string;
  status: string;
  recordCount: number;
}

export interface DpRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  line: string;
  lineName: string;
  ttl: number;
  mx: number;
  weight: number;
  status: string; // "ENABLE" | "DISABLE"
}

export interface DpLine {
  lineId: string;
  name: string;
  parent: string | null;
}

/**
 * List all domains.
 */
export async function listZones(secretId: string, secretKey: string): Promise<DpZone[]> {
  const resp = await dpFetch<{
    DomainList?: { DomainId?: number; Name?: string; Status?: string; RecordCount?: number }[];
    DomainCountInfo?: { DomainTotal?: number };
  }>(secretId, secretKey, "DescribeDomainList", { Offset: 0, Limit: 100 });

  return (resp.DomainList ?? []).map((d) => ({
    id: String(d.DomainId ?? 0),
    name: d.Name ?? "",
    status: d.Status === "ENABLE" ? "active" : (d.Status ?? ""),
    recordCount: d.RecordCount ?? 0,
  }));
}

/**
 * List all records in a domain.
 */
export async function listRecords(secretId: string, secretKey: string, domain: string): Promise<DpRecord[]> {
  const resp = await dpFetch<{
    RecordList?: {
      RecordId?: number;
      Name?: string;
      Type?: string;
      Value?: string;
      LineId?: string;
      Line?: string;
      TTL?: number;
      MX?: number;
      Weight?: number;
      Status?: string;
    }[];
    RecordCountInfo?: { TotalCount?: number };
  }>(secretId, secretKey, "DescribeRecordList", { Domain: domain, Offset: 0, Limit: 3000 });

  return (resp.RecordList ?? []).map((r) => ({
    id: String(r.RecordId ?? 0),
    name: r.Name ?? "",
    type: fromApiType(r.Type ?? ""),
    content: r.Value ?? "",
    line: r.LineId ?? "",
    lineName: r.Line ?? "",
    ttl: r.TTL ?? 600,
    mx: r.MX ?? 0,
    weight: r.Weight ?? 0,
    status: r.Status ?? "ENABLE",
  }));
}

/**
 * Create a record in a domain.
 */
export async function createRecord(
  secretId: string,
  secretKey: string,
  domain: string,
  params: {
    name: string;
    type: string;
    content: string;
    line?: string;
    lineName?: string;
    ttl?: number;
    mx?: number;
    weight?: number;
  }
): Promise<DpRecord> {
  const body: Record<string, unknown> = {
    Domain: domain,
    SubDomain: params.name,
    RecordType: toApiType(params.type),
    Value: params.content,
    RecordLine: params.lineName ?? "Default",
    RecordLineId: params.line ?? "0",
    TTL: params.ttl ?? 600,
    Weight: params.weight ?? null,
  };
  if (params.type === "MX" && params.mx !== undefined) {
    body.MX = params.mx;
  }

  const resp = await dpFetch<{ RecordId?: number }>(secretId, secretKey, "CreateRecord", body);
  return {
    id: String(resp.RecordId ?? 0),
    name: params.name,
    type: params.type,
    content: params.content,
    line: params.line ?? "0",
    lineName: "",
    ttl: params.ttl ?? 600,
    mx: params.mx ?? 0,
    weight: params.weight ?? 0,
    status: "ENABLE",
  };
}

/**
 * Update a record in a domain.
 */
export async function updateRecord(
  secretId: string,
  secretKey: string,
  domain: string,
  recordId: string,
  params: {
    name: string;
    type: string;
    content: string;
    line?: string;
    lineName?: string;
    ttl?: number;
    mx?: number;
    weight?: number;
  }
): Promise<void> {
  const body: Record<string, unknown> = {
    Domain: domain,
    RecordId: Number(recordId),
    SubDomain: params.name,
    RecordType: toApiType(params.type),
    Value: params.content,
    RecordLine: params.lineName ?? "Default",
    RecordLineId: params.line ?? "0",
    TTL: params.ttl ?? 600,
    Weight: params.weight ?? null,
  };
  if (params.type === "MX" && params.mx !== undefined) {
    body.MX = params.mx;
  }

  await dpFetch(secretId, secretKey, "ModifyRecord", body);
}

/**
 * Delete a record from a domain.
 */
export async function deleteRecord(
  secretId: string,
  secretKey: string,
  domain: string,
  recordId: string
): Promise<void> {
  await dpFetch(secretId, secretKey, "DeleteRecord", {
    Domain: domain,
    RecordId: Number(recordId),
  });
}

/**
 * List resolution lines for a domain.
 */
export async function listLines(secretId: string, secretKey: string, domain: string): Promise<DpLine[]> {
  const resp = await dpFetch<{
    LineList?: DpApiLineItem[];
  }>(secretId, secretKey, "DescribeRecordLineCategoryList", { Domain: domain });

  const lines: DpLine[] = [];
  processLineList(lines, resp.LineList ?? [], null);
  return lines;
}

interface DpApiLineItem {
  LineId?: string;
  LineName?: string;
  Useful?: boolean;
  SubGroup?: DpApiLineItem[];
}

function processLineList(lines: DpLine[], items: DpApiLineItem[], parent: string | null): void {
  for (const item of items) {
    let lineId = item.LineId ?? "";
    if (!lineId) lineId = "N." + (item.LineName ?? "");
    if (item.Useful) {
      if (!lines.some((l) => l.lineId === lineId)) {
        lines.push({ lineId, name: item.LineName ?? "", parent });
      }
      if (item.SubGroup && item.SubGroup.length > 0) {
        processLineList(lines, item.SubGroup, lineId);
      }
    }
  }
}
