import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { Button } from "./Button";

export function Layout() {
  const { username, logout, authenticated } = useAuth();
  const { lang, setLang, t } = useLang();
  const [busy, setBusy] = useState(false);

  const NAV = [
    { to: "/", label: t("nav.home"), end: true },
    { to: "/domains", label: t("nav.domains") },
    { to: "/providers", label: t("nav.providers") },
  ];

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
      // Hard refresh so the root loader re-runs from a clean state; avoids
      // any race between the in-flight revalidate and the route guards.
      window.location.assign("/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <img src="/favicon.png" alt="Dotnify" className="h-7 w-7" />
          Dotnify
        </Link>
        {authenticated && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              <span className="text-slate-400">{t("header.signedInAs")}</span>{" "}
              <span className="font-medium text-slate-700">{username}</span>
            </span>
            <Button variant="ghost" onClick={handleLogout} loading={busy} className="px-3 py-1.5 text-xs">
              {t("header.signOut")}
            </Button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {authenticated && (
          <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "zh-CN" : "en")}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                {lang === "en" ? "中文" : "EN"}
              </button>
            </div>
          </aside>
        )}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
