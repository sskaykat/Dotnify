import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useFetch } from "@/hooks/useFetch";
import type { Provider, ProviderType, Zone } from "@/lib/types";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";

const HW_REGIONS = [
  { value: "cn-north-1", label: "North Beijing-1" },
  { value: "cn-north-4", label: "North Beijing-4" },
  { value: "cn-east-2", label: "East Shanghai-2" },
  { value: "cn-east-3", label: "East Shanghai-1" },
  { value: "cn-south-1", label: "South Guangzhou" },
  { value: "cn-southwest-2", label: "Southwest Guiyang-1" },
  { value: "ap-southeast-1", label: "Hong Kong" },
  { value: "ap-southeast-2", label: "Bangkok" },
  { value: "ap-southeast-3", label: "Singapore" },
];

export function Providers() {
  const { data: providers, loading, error, refetch } = useFetch<Provider[]>("/api/providers");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">DNS Providers</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage the API credentials used to access your DNS zones.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "secondary" : "primary"}>
          {showForm ? "Cancel" : "Add provider"}
        </Button>
      </div>

      {showForm && <AddForm onSaved={() => { setShowForm(false); void refetch(); }} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <Spinner label="Loading providers" />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : !providers || providers.length === 0 ? (
        <EmptyState
          title="No providers yet"
          description="Add a DNS provider to start managing its DNS records."
          action={<Button onClick={() => setShowForm(true)}>Add your first provider</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {providers.map((p) => (
            <ProviderRow key={p.id} provider={p} onChanged={() => void refetch()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [providerType, setProviderType] = useState<ProviderType>("cloudflare");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiAccessKey, setApiAccessKey] = useState("");
  const [apiSecretKey, setApiSecretKey] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"input" | "select">("input");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Step 1: verify credentials + fetch zones (nothing persisted yet).
  async function verifyAndFetchZones(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (providerType === "cloudflare" && !apiKey.trim()) {
      setError("API token is required");
      return;
    }
    if (providerType === "huawei") {
      if (!apiAccessKey.trim() || !apiSecretKey.trim()) {
        setError("Access Key ID and Secret Access Key are required");
        return;
      }
    }

    setBusy(true);
    try {
      const body: Record<string, unknown> = { type: providerType };
      if (providerType === "cloudflare") {
        body.apiKey = apiKey.trim();
      } else {
        body.apiAccessKey = apiAccessKey.trim();
        body.apiSecretKey = apiSecretKey.trim();
        if (region) body.region = region;
      }
      const result = await apiFetch<Zone[]>("/api/providers/verify", {
        method: "POST",
        body,
      });
      setZones(Array.isArray(result) ? result : []);
      setSelected(new Set());
      setStep("select");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleZone(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Step 2: persist the provider with the selected zones in one shot.
  async function save() {
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        type: providerType,
        name: name.trim(),
        selectedZones: [...selected],
      };
      if (providerType === "cloudflare") {
        body.apiKey = apiKey.trim();
      } else {
        body.apiAccessKey = apiAccessKey.trim();
        body.apiSecretKey = apiSecretKey.trim();
        if (region) body.region = region;
      }
      await apiFetch("/api/providers", {
        method: "POST",
        body,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save provider");
    } finally {
      setBusy(false);
    }
  }

  if (step === "select") {
    return (
      <Card title="Select zones" description="Pick which domains to manage. Leave all unchecked to manage every accessible zone.">
        {zones.length === 0 ? (
          <p className="text-sm text-slate-500">No zones accessible with these credentials.</p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {zones.map((z) => (
              <li key={z.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.has(z.id)}
                    onChange={() => toggleZone(z.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="font-mono text-sm text-slate-900">{z.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{z.status}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setStep("input"); setError(null); }} disabled={busy}>Back</Button>
          <Button onClick={save} loading={busy}>
            {selected.size === 0 ? "Save (all zones)" : `Save (${selected.size} zone${selected.size > 1 ? "s" : ""})`}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title={providerType === "huawei" ? "Add Huawei Cloud provider" : "Add Cloudflare provider"}>
      <form onSubmit={verifyAndFetchZones} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Provider type</label>
          <div className="flex gap-2">
            {(["cloudflare", "huawei"] as ProviderType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setProviderType(t)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  providerType === t
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {t === "cloudflare" ? "Cloudflare" : "Huawei Cloud"}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Display name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={providerType === "cloudflare" ? "My Cloudflare account" : "My Huawei Cloud account"}
          required
          hint="A label so you can tell providers apart later."
        />
        {providerType === "cloudflare" ? (
          <Input
            label="API token"
            name="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Cloudflare API token"
            required
            hint="We verify the token against Cloudflare, then let you pick zones."
            error={error}
          />
        ) : (
          <>
            <Input
              label="Access Key ID"
              name="apiAccessKey"
              type="password"
              value={apiAccessKey}
              onChange={(e) => setApiAccessKey(e.target.value)}
              placeholder="Huawei Cloud AK"
              required
              hint="Your Huawei Cloud access key ID."
            />
            <Input
              label="Secret Access Key"
              name="apiSecretKey"
              type="password"
              value={apiSecretKey}
              onChange={(e) => setApiSecretKey(e.target.value)}
              placeholder="Huawei Cloud SK"
              required
              hint="Your Huawei Cloud secret access key."
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Default (Global)</option>
                {HW_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.value})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400">Huawei Cloud DNS is a global service — usually no region selection is needed.</p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Verify & continue</Button>
        </div>
      </form>
    </Card>
  );
}

function ProviderRow({ provider, onChanged }: { provider: Provider; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/providers/${provider.id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete provider");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li>
        <EditProviderForm
          provider={provider}
          onSaved={() => { setEditing(false); onChanged(); }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const zoneCount = provider.selectedZones.length;

  return (
    <li>
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">
                {provider.type}
              </span>
              <h3 className="truncate text-sm font-semibold text-slate-900">{provider.name}</h3>
            </div>
            <dl className="mt-1 flex flex-wrap gap-x-6 gap-y-0.5 text-xs text-slate-500">
              {provider.type === "cloudflare" ? (
                <div>
                  <dt className="inline">Token:</dt>{" "}
                  <dd className="inline font-mono text-slate-700">{provider.apiKey}</dd>
                </div>
              ) : (
                <>
                  <div>
                    <dt className="inline">AK:</dt>{" "}
                    <dd className="inline font-mono text-slate-700">{provider.apiAccessKey}</dd>
                  </div>
                  <div>
                    <dt className="inline">Region:</dt>{" "}
                    <dd className="inline text-slate-700">{provider.region}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="inline">Zones:</dt>{" "}
                <dd className="inline text-slate-700">{zoneCount === 0 ? "all" : zoneCount}</dd>
              </div>
              <div>
                <dt className="inline">Added:</dt>{" "}
                <dd className="inline">{new Date(provider.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)} disabled={confirming}>
              Edit
            </Button>
            {confirming ? (
              <>
                <Button variant="danger" onClick={remove} loading={busy}>
                  Confirm delete
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setConfirming(true)} disabled={busy} className="text-red-600 hover:bg-red-50">
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>
    </li>
  );
}

function EditProviderForm({ provider, onSaved, onCancel }: { provider: Provider; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(provider.name);
  const [apiKey, setApiKey] = useState("");
  const [apiAccessKey, setApiAccessKey] = useState("");
  const [apiSecretKey, setApiSecretKey] = useState("");
  const [region, setRegion] = useState(provider.region ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { name: name.trim() };
      if (provider.type === "cloudflare" && apiKey.trim()) {
        body.apiKey = apiKey.trim();
      }
      if (provider.type === "huawei") {
        if (apiAccessKey.trim()) body.apiAccessKey = apiAccessKey.trim();
        if (apiSecretKey.trim()) body.apiSecretKey = apiSecretKey.trim();
        if (region !== (provider.region ?? "")) body.region = region;
      }
      await apiFetch(`/api/providers/${provider.id}`, {
        method: "PATCH",
        body,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update provider");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`Edit ${provider.name}`}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <Input
          label="Display name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My provider"
          required
        />
        {provider.type === "cloudflare" ? (
          <Input
            label="API token"
            name="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Leave blank to keep current token"
          />
        ) : (
          <>
            <Input
              label="Access Key ID"
              name="apiAccessKey"
              type="password"
              value={apiAccessKey}
              onChange={(e) => setApiAccessKey(e.target.value)}
              placeholder="Leave blank to keep current key"
            />
            <Input
              label="Secret Access Key"
              name="apiSecretKey"
              type="password"
              value={apiSecretKey}
              onChange={(e) => setApiSecretKey(e.target.value)}
              placeholder="Leave blank to keep current key"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Default (Global)</option>
                {HW_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.value})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" loading={busy}>Save</Button>
        </div>
      </form>
    </Card>
  );
}
