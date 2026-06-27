import { Link } from "react-router-dom";
import { useFetch } from "@/hooks/useFetch";
import type { ZoneWithProvider, Provider } from "@/lib/types";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ProviderLogo } from "@/components/ProviderLogo";

interface ZonesResponse {
  zones: ZoneWithProvider[];
  errors: { providerId: string; providerName: string; message: string }[];
}

export function Home() {
  const { data } = useFetch<ZonesResponse>("/api/zones");
  const { data: providers } = useFetch<Provider[]>("/api/providers");
  const zones = data?.zones ?? [];
  const providerCount = providers?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">dotnify</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage DNS records across Cloudflare and Huawei Cloud from one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-3xl font-semibold text-slate-900">{providerCount}</p>
          <p className="mt-1 text-sm text-slate-500">Providers</p>
        </Card>
        <Card>
          <p className="text-3xl font-semibold text-slate-900">{zones.length}</p>
          <p className="mt-1 text-sm text-slate-500">Domains</p>
        </Card>
        <Card>
          <p className="text-3xl font-semibold text-slate-900">
            {zones.filter((z) => z.status === "active").length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Active</p>
        </Card>
      </div>

      {zones.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Domains</h2>
          <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {zones.slice(0, 10).map((z) => (
              <li key={`${z.providerId}:${z.id}`} className="border-b border-slate-100 last:border-b-0">
                <Link
                  to={`/domains/${z.id}/records?providerId=${z.providerId}&providerType=${z.providerType}&zoneName=${encodeURIComponent(z.name)}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <ProviderLogo type={z.providerType} />
                  <span className="font-mono text-sm text-slate-900">{z.name}</span>
                  <span className={`ml-auto rounded-md px-2 py-0.5 text-xs font-medium ${
                    z.status === "active"
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {z.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {zones.length > 10 && (
            <Link to="/domains" className="mt-2 block text-center text-sm text-brand-600 hover:underline">
              View all {zones.length} domains
            </Link>
          )}
        </div>
      ) : (
        <EmptyOrNewState providerCount={providerCount} />
      )}
    </div>
  );
}

function EmptyOrNewState({ providerCount }: { providerCount: number }) {
  if (providerCount === 0) {
    return (
      <Card>
        <div className="py-4 text-center">
          <p className="text-sm text-slate-500">Get started by adding your first DNS provider.</p>
          <Link to="/providers" className="mt-3 inline-block">
            <Button>Add provider</Button>
          </Link>
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <div className="py-4 text-center">
        <p className="text-sm text-slate-500">No domains configured yet. Select zones from your providers.</p>
        <Link to="/providers" className="mt-3 inline-block">
          <Button variant="secondary">Manage providers</Button>
        </Link>
      </div>
    </Card>
  );
}
