import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requireAuth } from "../../_lib/middleware.js";
import { ok, error } from "../../_lib/response.js";
import type { ApiResponse } from "../../_lib/types.js";
import type { AuthedRequest } from "../../_lib/middleware.js";

/**
 * GET /api/zones/:zoneId/lines
 * Return Huawei Cloud resolution lines from local JSON file.
 * Line data is static and stored locally for performance and stability.
 */

interface LineEntry {
  name: string;
  parent: string | null;
}

let cachedLines: { line: string; name: string; parent: string | null }[] | null = null;

function getLines(): { line: string; name: string; parent: string | null }[] {
  if (cachedLines) return cachedLines;
  const filePath = join(process.cwd(), "src/huawei_line.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, LineEntry>;
  cachedLines = Object.entries(raw).map(([id, entry]) => ({
    line: id,
    name: entry.name,
    parent: entry.parent,
  }));
  return cachedLines;
}

export default requireAuth(async (req, res) => {
  if (req.method === "GET") {
    return ok(res as ApiResponse, getLines());
  }
  return error(res as ApiResponse, "Method not allowed", 405);
});
