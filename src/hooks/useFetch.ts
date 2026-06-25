import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic GET hook with manual refetch. For mutations use `apiFetch` directly.
 * Pass `null` as `path` to skip fetching (e.g. until a param is known).
 */
export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!path, error: null });
  const reqIdRef = useRef(0);

  const run = useCallback(async () => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const reqId = ++reqIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiFetch<T>(path, { allow401: true });
      if (reqId === reqIdRef.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (e) {
      if (reqId === reqIdRef.current) {
        const msg = e instanceof ApiError ? e.message : "Failed to load";
        setState({ data: null, loading: false, error: msg });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  return { ...state, refetch: run };
}
