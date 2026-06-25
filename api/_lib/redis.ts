import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client singleton.
 * Reads credentials from the environment variables configured on Vercel
 * (or in `.env.local` for local development with `vercel dev`).
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  // Defer hard failure until first actual call so the app can still boot
  // (e.g. /api/auth/me returns gracefully when admin is missing).
  console.warn(
    "[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. " +
      "Redis calls will fail until these are configured."
  );
}

export const redis = new Redis({
  url: url ?? "",
  token: token ?? "",
});

export const KEYS = {
  admin: "dotnify:admin",
  session: (token: string) => `dotnify:session:${token}`,
  providers: "dotnify:providers",
} as const;
