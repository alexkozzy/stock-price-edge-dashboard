/**
 * Edge table — one row per (ticker, close_date, strike, side) signal.
 * Sorted by |tradeable_edge_pp| desc; ties broken by |edge_pp|.
 */
import type { StockSignal } from "@/lib/types";
import { TRADEABLE_FLOOR_PP } from "@/lib/types";

function fmtPct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}
function fmtPp(pp: number | null): string {
  if (pp === null) return "—";
  return `${pp >= 0 ? "+" : ""}${pp.toFixed(1)}pp`;
}
function fmtStrike(s: number): string {
  return `$${s.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function fmtLiq(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function sideClass(side: string): string {
  return side === "above" ? "text-emerald-400" : "text-rose-400";
}
function edgeColor(pp: number, tradeable: number | null): string {
  const usable = tradeable !== null && Math.abs(tradeable) >= TRADEABLE_FLOOR_PP;
  if (!usable) return "text-zinc-500";
  return pp > 0 ? "text-emerald-400" : "text-rose-400";
}

export function SignalGrid({ signals }: { signals: StockSignal[] }) {
  const sorted = [...signals].sort((a, b) => {
    const ta = a.tradeable_edge_pp === null ? 0 : Math.abs(a.tradeable_edge_pp);
    const tb = b.tradeable_edge_pp === null ? 0 : Math.abs(b.tradeable_edge_pp);
    if (tb !== ta) return tb - ta;
    return Math.abs(b.edge_pp) - Math.abs(a.edge_pp);
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
        No signals in the current snapshot.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-950/50 text-left text-xs uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-2 font-medium">Tkr</th>
            <th className="px-3 py-2 font-medium">Side</th>
            <th className="px-3 py-2 text-right font-medium">Strike</th>
            <th className="px-3 py-2 text-right font-medium">Spot</th>
            <th className="px-3 py-2 text-right font-medium">Fair</th>
            <th className="px-3 py-2 text-right font-medium">Mkt</th>
            <th className="px-3 py-2 text-right font-medium">Edge</th>
            <th className="px-3 py-2 text-right font-medium" title="Bid/ask spread in pp">Sprd</th>
            <th
              className="px-3 py-2 text-right font-medium"
              title="Edge net of bid/ask spread — what you can actually capture"
            >
              Trd
            </th>
            <th className="px-3 py-2 text-right font-medium">Days</th>
            <th className="px-3 py-2 text-right font-medium">Liq</th>
            <th className="px-3 py-2 font-medium">Close</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr
              key={`${s.market_id}-${i}`}
              className="border-b border-zinc-800/60 last:border-b-0 hover:bg-zinc-900/60"
            >
              <td className="px-3 py-2 font-mono font-semibold">{s.ticker}</td>
              <td className={`px-3 py-2 font-mono uppercase ${sideClass(s.side)}`}>
                {s.side}
              </td>
              <td className="px-3 py-2 text-right font-mono">{fmtStrike(s.strike)}</td>
              <td className="px-3 py-2 text-right font-mono text-zinc-400">
                {fmtStrike(s.spot)}
              </td>
              <td className="px-3 py-2 text-right font-mono">{fmtPct(s.fair_yes)}</td>
              <td className="px-3 py-2 text-right font-mono text-zinc-300">
                {fmtPct(s.market_yes)}
              </td>
              <td className={`px-3 py-2 text-right font-mono font-semibold ${edgeColor(s.edge_pp, s.tradeable_edge_pp)}`}>
                {fmtPp(s.edge_pp)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-zinc-500">
                {fmtPp(s.spread_pp)}
              </td>
              <td className={`px-3 py-2 text-right font-mono ${edgeColor(s.tradeable_edge_pp ?? 0, s.tradeable_edge_pp)}`}>
                {fmtPp(s.tradeable_edge_pp)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-zinc-500">{s.days.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono text-zinc-500">{fmtLiq(s.liquidity)}</td>
              <td className="px-3 py-2 text-right font-mono text-zinc-500">{s.close_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
