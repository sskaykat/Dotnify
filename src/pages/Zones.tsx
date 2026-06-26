import { Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import type { ZoneWithProvider } from "@/lib/types";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { ProviderLogo } from "@/components/ProviderLogo";

interface ZonesResponse {
  zones: ZoneWithProvider[];
  errors: { providerId: string; providerName: string; message: string }[];
}

export function Zones() {
  const { data, loading, error, refetch } = useFetch<ZonesResponse>("/api/zones");
  const zones = data?.zones ?? [];
  const providerErrors = data?.errors ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Zones</h1>
        <p className="mt-0.5 text-sm text-slate-500">All domains from every configured provider.</p>
      </div>

      {loading ? (
        <Spinner label="Loading zones" />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={() => void refetch()}>Retry</Button>
        </Card>
      ) : zones.length === 0 ? (
        <EmptyState
          title="No zones yet"
          description="Add a provider and select its zones to see them here."
          action={<Link to="/providers"><Button>Go to providers</Button></Link>}
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {zones.map((z) => (
            <li key={`${z.providerId}:${z.id}`} className="border-b border-slate-100 last:border-b-0">
              <Link
                to={`/zones/${z.id}/records?providerId=${z.providerId}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
              >
                <ProviderLogo type={z.providerType} />
                <span className="font-mono text-sm text-slate-900">{z.name}</span>
                <span className="text-xs text-slate-400">{z.providerName}</span>
                <span className="ml-auto flex items-center gap-3">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    z.status === "active"
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {z.status}
                  </span>
                  <span className="text-sm text-brand-600">View records →</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {providerErrors.length > 0 && (
        <Card>
          <p className="text-sm font-medium text-slate-700">Some providers failed to load:</p>
          <ul className="mt-2 space-y-1">
            {providerErrors.map((e) => (
              <li key={e.providerId} className="text-xs text-red-600">
                {e.providerName}: {e.message}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
