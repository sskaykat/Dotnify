import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { redis, KEYS } from "./redis.js";
import type { Admin, Session } from "./types.js";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
/** Refresh TTL when remaining time drops below this threshold. */
const SESSION_REFRESH_THRESHOLD = Math.floor(SESSION_TTL_SECONDS / 2); // 3.5 days

/**
 * Upstash SDK auto-deserializes JSON-looking strings into objects by default,
 * so redis.get may return either the raw JSON string or an already-parsed
 * object. Normalize both into a typed value.
 */
function parseStored<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

/** Hash a password with a fresh salt, returning `scrypt:<salt_hex>:<hash_hex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Verify a password against a stored `scrypt:<salt_hex>:<hash_hex>` string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN);
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

/** Create a session token, store it in Redis with 7-day TTL, return the token. */
export async function createSession(username: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const session: Session = { username, createdAt: new Date().toISOString() };
  await redis.set(KEYS.session(token), JSON.stringify(session), {
    ex: SESSION_TTL_SECONDS,
  });
  return token;
}

/** Look up a session by token. Returns null if missing/expired. */
export async function getSession(token: string): Promise<Session | null> {
  const raw = await redis.get<unknown>(KEYS.session(token));
  return parseStored<Session>(raw);
}

/** Delete a session token (logout). */
export async function destroySession(token: string): Promise<void> {
  await redis.del(KEYS.session(token));
}

/**
 * Sliding expiration: refresh the session TTL if it's getting low.
 *
 * This ensures that active users never get logged out as long as they
 * use the app within the idle window. Only refreshes when the remaining
 * TTL drops below SESSION_REFRESH_THRESHOLD to avoid a Redis write on
 * every single request.
 *
 *   Full TTL:  7 days — set on login / refresh
 *   Threshold: 3.5 days — refresh kicks in below this
 *
 * So a user who is active at least once every 3.5 days stays logged in
 * indefinitely; after 3.5+ days of inactivity the session expires.
 */
export async function refreshSessionTTL(token: string): Promise<void> {
  const key = KEYS.session(token);
  const ttl = await redis.ttl(key);
  // redis.ttl returns: -2 = key missing, -1 = no expiry, >0 = seconds left
  if (ttl > 0 && ttl < SESSION_REFRESH_THRESHOLD) {
    await redis.expire(key, SESSION_TTL_SECONDS);
  }
}

/** Get the admin record, or null if not yet set up. */
export async function getAdmin(): Promise<Admin | null> {
  const raw = await redis.get<unknown>(KEYS.admin);
  return parseStored<Admin>(raw);
}

/**
 * Atomically create the admin record. Returns true if created, false if
 * an admin already existed (prevents TOCTOU race on /setup).
 */
export async function createAdmin(admin: Admin): Promise<boolean> {
  const ok = await redis.set(KEYS.admin, JSON.stringify(admin), { nx: true });
  return ok === "OK";
}

/** Extract a bearer token from the Authorization header string. */
export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
