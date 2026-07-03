import { redis } from "./redis.js";
import type { Context, Next } from "hono";

const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS = 10;

/**
 * Redis-backed rate limiter keyed by IP.
 * Allows MAX_ATTEMPTS requests per WINDOW_SECONDS per IP.
 * Works across serverless cold starts and multiple instances.
 */
export async function rateLimit(c: Context, next: Next) {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown";

  const key = `dotnify:ratelimit:${ip}`;

  const count = await redis.incr(key);
  if (count === 1) {
    // First request in this window — set TTL
    await redis.expire(key, WINDOW_SECONDS);
  }

  if (count > MAX_ATTEMPTS) {
    return c.json({ ok: false, error: "Too many requests, please try again later" }, 429);
  }

  return next();
}
