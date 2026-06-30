import type { Context, Next } from "hono";

const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_ATTEMPTS = 10;

/**
 * Simple in-memory rate limiter keyed by IP.
 * Allows MAX_ATTEMPTS requests per WINDOW_MS per IP.
 */
export async function rateLimit(c: Context, next: Next) {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    ?? c.req.header("x-real-ip")
    ?? "unknown";

  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return c.json({ ok: false, error: "Too many requests, please try again later" }, 429);
  }

  return next();
}
