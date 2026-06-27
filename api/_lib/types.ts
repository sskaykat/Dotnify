/** Minimal HTTP types so we don't need to depend on `@vercel/node` types. */

export interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  end(): void;
}

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => void | Promise<void>;

export interface Admin {
  username: string;
  passwordHash: string; // `scrypt:<salt_hex>:<hash_hex>`
  createdAt: string; // ISO timestamp
}

export interface Session {
  username: string;
  createdAt: string; // ISO timestamp
}

export type ProviderType = "cloudflare" | "huawei";

export interface Provider {
  id: string;
  type: ProviderType;
  name: string;
  apiKey: string; // plaintext (MVP) — Cloudflare token
  apiAccessKey?: string; // Huawei Cloud AK
  apiSecretKey?: string; // Huawei Cloud SK
  region?: string; // Huawei Cloud region code (e.g. cn-north-1)
  createdAt: string; // ISO timestamp
  /** Zone ids the user chose to manage (empty = all accessible zones). */
  selectedZones: string[];
}

export interface Zone {
  id: string;
  name: string;
  status: string;
  // Cloudflare returns more fields; we only expose what the UI needs.
}

export type RecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "TXT"
  | "MX"
  | "NS"
  | "SRV"
  | "CAA"
  | "PTR"
  | "SOA"
  | "SPF"
  | "URI";

export interface DnsRecord {
  id: string;
  type: RecordType;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  line?: string; // Huawei Cloud: resolution line (线路类型)
}

export interface CloudflareResponse<T> {
  result: T | T[];
  result_info?: {
    page: number;
    per_page: number;
    total_pages: number;
    count: number;
    total_count: number;
  };
  success: boolean;
  errors: { code: number; message: string }[];
  messages: { code: number; message: string }[];
}
