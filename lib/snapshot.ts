/**
 * Snapshot loader.
 *
 * Two resolution paths:
 *   1. SNAPSHOT_BASE_URL set → fetch `${base}/data/snapshot_latest.json` (remote)
 *      (GH Pages serves the data repo at the repo root; files are in /data/)
 *   2. Otherwise → read the bundled `data/snapshot_latest.json` (local)
 *
 * All loads run through Zod; on validation failure the API route returns 500
 * and the UI shows its empty state.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { StockEdgeSnapshotSchema, type StockEdgeSnapshot } from "./types";

export type LoadResult =
  | { ok: true; value: StockEdgeSnapshot; source: "remote" | "local" }
  | { ok: false; error: string };

export async function loadSnapshot(): Promise<LoadResult> {
  const base = process.env.SNAPSHOT_BASE_URL?.replace(/\/$/, "");
  try {
    let raw: unknown;
    let source: "remote" | "local";
    if (base) {
      const r = await fetch(`${base}/data/snapshot_latest.json`, { cache: "no-store" });
      if (!r.ok) {
        return { ok: false, error: `remote snapshot ${r.status}` };
      }
      raw = await r.json();
      source = "remote";
    } else {
      const abs = path.join(process.cwd(), "data", "snapshot_latest.json");
      const txt = await fs.readFile(abs, "utf8");
      raw = JSON.parse(txt);
      source = "local";
    }
    const parsed = StockEdgeSnapshotSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: `Zod validation failed: ${parsed.error.message}` };
    }
    return { ok: true, value: parsed.data, source };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
