export interface MeResponse {
  setupRequired: boolean;
  authenticated: boolean;
  username: string | null;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface SetupResponse {
  username: string;
  createdAt: string;
}

export type ProviderType = "cloudflare";

export interface Provider {
  id: string;
  type: ProviderType;
  name: string;
  apiKey: string; // masked on read in the UI; backend stores plaintext
  createdAt: string;
  selectedZones: string[];
}

export interface Zone {
  id: string;
  name: string;
  status: string;
}

/** Zone with its owning provider info, as returned by GET /api/zones. */
export interface ZoneWithProvider extends Zone {
  providerId: string;
  providerName: string;
  providerType: ProviderType;
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
}
