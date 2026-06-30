import { Hono } from "hono";
import auth from "./routes/auth.js";
import providers from "./routes/providers.js";
import zones from "./routes/zones.js";

const app = new Hono();

// Global error handler
app.onError((err, c) => {
  console.error("[server] unhandled error:", err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

// API routes
app.route("/api/auth", auth);
app.route("/api/providers", providers);
app.route("/api/zones", zones);

export default app;
