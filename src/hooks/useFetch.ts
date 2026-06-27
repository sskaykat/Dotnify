import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True while a background revalidation is in flight (data already shown). */
  isValidating: boolean;
}

/**
 * In-memory cache shared across all useFetch callers, keyed by path.
 * Lets us show stale data instantly on route re-entry while revalidating.
 * Not persisted — a full page reload still hits the network.
 */
const cache = new Map<string, unknown>();

/**
 * Generic GET hook with stale-while-revalidate semantics.
 *
 * - First mount: loads, shows loading spinner until done.
 * - Re-mount with the same path (e.g. navigating away and back): instantly
 *   shows the cached data, then silently refetches in the background.
 * - `refetch()` forces a reload regardless of cache.
 *
 * Pass `null` as `path` to skip fetching (e.g. until a param is known).
 */
export function useFetch<T>(path: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>(() => {
    if (!path) return { data: null, loading: false, error: null, isValidating: false };
    const cached = cache.get(path) as T | undefined;
    if (cached !== undefined) {
      return { data: cached, loading: false, error: null, isValidating: true };
    }
    return { data: null, loading: true, error: null, isValidating: false };
  });
  const reqIdRef = useRef(0);

  const run = useCallback(async () => {
    if (!path) {
      setState({ data: null, loading: false, error: null, isValidating: false });
      return;
    }
    const reqId = ++reqIdRef.current;
    // If we have cached data, don't flip to loading (keep showing stale data).
    const hasCache = cache.has(path);
    setState((s) => ({
      ...s,
      loading: !hasCache,
      error: null,
      isValidating: true,
    }));
    try {
      const data = await apiFetch<T>(path, { allow401: true });
      if (reqId === reqIdRef.current) {
        cache.set(path, data);
        setState({ data, loading: false, error: null, isValidating: false });
      }
    } catch (e) {
      if (reqId === reqIdRef.current) {
        const msg = e instanceof ApiError ? e.message : "Failed to load";
        setState((s) => ({ ...s, loading: false, error: msg, isValidating: false }));
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

/** Drop cached data for a path (e.g. after a mutation invalidates it). */
export function invalidate(path: string): void {
  cache.delete(path);
}
