import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import type { SetupResponse } from "@/lib/types";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";

export function Setup() {
  const { refresh } = useAuth();
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("setup.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("setup.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await apiFetch<SetupResponse>("/api/auth/setup", {
        method: "POST",
        noAuth: true,
        body: { username, password },
      });
      // Re-run the root loader; SetupGuard will see setupRequired=false and
      // redirect to / (then IndexRedirect -> /login) automatically.
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card title={t("setup.title")} description={t("setup.description")}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label={t("setup.username")}
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            required
            minLength={3}
          />
          <Input
            label={t("setup.password")}
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            hint={t("setup.passwordHint")}
          />
          <Input
            label={t("setup.confirmPassword")}
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            error={error}
          />
          <Button type="submit" loading={busy}>
            {t("setup.createAdmin")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
