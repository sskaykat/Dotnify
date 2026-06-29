import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Card } from "@/components/Card";

export function Login() {
  const { login } = useAuth();
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // login() stores the token and calls revalidate(); the root loader
      // re-runs, LoginGuard sees authenticated=true and redirects to
      // /providers automatically — no manual navigate needed.
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 bg-slate-50 dark:bg-slate-900">
      <Card title={t("login.title")} description={t("login.description")}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label={t("login.username")}
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input
            label={t("login.password")}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={error}
          />
          <Button type="submit" loading={busy}>
            {t("login.signIn")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
