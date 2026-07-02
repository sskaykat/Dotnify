import lineData from "../../src/huawei_line.json";

interface LineEntry {
  name: string;
  parent: string | null;
}

let cachedLines: { line: string; name: string; parent: string | null }[] | null = null;

export function getLines(): { line: string; name: string; parent: string | null }[] {
  if (cachedLines) return cachedLines;
  const raw = lineData as Record<string, LineEntry>;
  cachedLines = Object.entries(raw).map(([id, entry]) => ({
    line: id,
    name: entry.name,
    parent: entry.parent,
  }));
  return cachedLines;
}
