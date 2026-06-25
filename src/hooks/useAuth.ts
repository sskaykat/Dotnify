import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/token";
import type { MeResponse } from "@/lib/types";

interface AuthState {
  loading: boolean;
  setupRequired: boolean;
  authenticated: boolean;
  username: string | null;
}

const INITIAL: AuthState = {
  loading: true,
  setupRequired: false,
  authenticated: false,
  username: null,
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL);

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const me = await apiFetch<MeResponse>("/api/auth/me", { noAuth: true, allow401: true });
      setState({
        loading: false,
        setupRequired: me.setupRequired,
        authenticated: me.authenticated,
        username: me.username,
      });
      return me;
    } catch {
      setState({ loading: false, setupRequired: false, authenticated: false, username: null });
      return null;
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token, username: confirmed } = await apiFetch<{
      token: string;
      username: string;
    }>("/api/auth/login", { method: "POST", noAuth: true, body: { username, password } });
    setToken(token);
    setState({ loading: false, setupRequired: false, authenticated: true, username: confirmed });
    return confirmed;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", allow401: true });
    } catch {
      // ignore network errors on logout
    }
    clearToken();
    setState({ loading: false, setupRequired: false, authenticated: false, username: null });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, token: getToken(), refresh, login, logout };
}
