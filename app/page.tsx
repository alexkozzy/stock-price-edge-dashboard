/**
 * Home page — Polymarket stock-price edge table.
 *
 * Reads the latest snapshot via `lib/snapshot.ts`. Renders a single table
 * sorted by |tradeable_edge_pp|, with summary stats above and a footer
 * showing snapshot freshness + source.
 */
import { SignalGrid } from "@/components/SignalGrid";
import { loadSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const revalidate = 60;

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default async function HomePage() {
  const result = await loadSnapshot();

  if (!result.ok) {
    return (
      <section className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-6 text-sm text-rose-300">
        Could not load snapshot: <span className="font-mono">{result.error}</span>
        <div className="mt-2 text-xs text-zinc-500">
          Run <code className="font-mono">python -m src.scan --snapshot-dir data/snapshots</code>{" "}
          in the stock-price-edge project to regenerate.
        </div>
      </section>
    );
  }

  const { value: snap, source } = result;
  const tradeable = snap.signals.filter(
    (s) => s.tradeable_edge_pp !== null && Math.abs(s.tradeable_edge_pp) >= 1,
  ).length;
  const above5 = snap.signals.filter((s) => Math.abs(s.edge_pp) >= 5).length;
  const tickers = new Set(snap.signals.map((s) => s.ticker)).size;

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Signals" value={snap.signals.length.toString()} />
        <Kpi label="Edge ≥5pp" value={above5.toString()} />
        <Kpi
          label="Tradeable"
          value={tradeable.toString()}
          tooltip="|edge_pp − spread_pp| ≥ 1pp"
        />
        <Kpi label="Tickers" value={tickers.toString()} />
      </section>

      <section className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Edge table</h1>
        <span className="font-mono text-xs text-zinc-500" title={snap.generated_at}>
          snapshot {relativeTime(snap.generated_at)} · {source}
        </span>
      </section>

      <SignalGrid signals={snap.signals} />
    </>
  );
}

function Kpi({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <div
      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
      title={tooltip}
    >
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}
