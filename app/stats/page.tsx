/**
 * /stats — paper-trading ledger summary.
 *
 * Reads paper_bets_open.jsonl and paper_bets_settled.jsonl from the public
 * data repo (via SNAPSHOT_BASE_URL). Renders headline KPIs + recent
 * settled trades. Empty state when ledger has no data yet.
 */
import { loadPaperLedger, summarize } from "@/lib/paperLedger";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Stats · Stock-price Edge",
};

function fmtUsd(n: number, signed = false): string {
  const sign = signed ? (n >= 0 ? "+" : "") : "";
  return `${sign}$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtPp(n: number | null): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}pp`;
}

export default async function StatsPage() {
  const ledger = await loadPaperLedger();
  const s = summarize(ledger.open, ledger.settled);

  const pnlColor =
    s.total_pnl_dollars > 0
      ? "text-emerald-400"
      : s.total_pnl_dollars < 0
        ? "text-rose-400"
        : "text-zinc-500";

  return (
    <>
      <section className="flex items-baseline justify-between border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Paper-trading ledger</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Fake $100 bets logged for every signal with |edge| ≥ 5pp. Resolved
            against actual close prices. No real money.
          </p>
        </div>
      </section>

      {ledger.open.length === 0 && ledger.settled.length === 0 ? (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
          No paper bets in the ledger yet. The scheduler logs new bets on each
          scan. Wait for the next run or trigger manually with{" "}
          <code className="font-mono">launchctl start com.alexkozlov.stock-price-edge</code>.
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Open" value={s.n_open.toString()} />
            <Kpi label="Settled" value={s.n_settled.toString()} />
            <Kpi
              label="Win rate"
              value={fmtPct(s.win_rate)}
              hint={s.n_settled > 0 ? `${s.n_won}W / ${s.n_lost}L` : undefined}
            />
            <Kpi
              label="Total P&L"
              value={fmtUsd(s.total_pnl_dollars, true)}
              valueClass={pnlColor}
            />
            <Kpi
              label="ROI"
              value={s.roi_pct === null ? "—" : `${s.roi_pct >= 0 ? "+" : ""}${s.roi_pct.toFixed(1)}%`}
              valueClass={pnlColor}
            />
            <Kpi label="Mean P&L / bet" value={s.mean_pnl_per_bet === null ? "—" : fmtUsd(s.mean_pnl_per_bet, true)} />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                Mean |edge| on winners
              </div>
              <div className="mt-1 font-mono text-emerald-400">
                {fmtPp(s.mean_edge_winners_pp)}
              </div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                Mean |edge| on losers
              </div>
              <div className="mt-1 font-mono text-rose-400">
                {fmtPp(s.mean_edge_losers_pp)}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium tracking-tight">
              Recent settled ({Math.min(ledger.settled.length, 20)} of {ledger.settled.length})
            </h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2 font-medium">Result</th>
                    <th className="px-3 py-2 font-medium">Ticker</th>
                    <th className="px-3 py-2 font-medium">Side</th>
                    <th className="px-3 py-2 text-right font-medium">Strike</th>
                    <th className="px-3 py-2 text-right font-medium">Actual close</th>
                    <th className="px-3 py-2 text-right font-medium">Edge entry</th>
                    <th className="px-3 py-2 text-right font-medium">P&L</th>
                    <th className="px-3 py-2 font-medium">Close date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...ledger.settled]
                    .sort((a, b) => (b.resolution?.settled_at ?? "").localeCompare(a.resolution?.settled_at ?? ""))
                    .slice(0, 20)
                    .map((b) => {
                      const won = b.status === "settled_win";
                      return (
                        <tr key={b.bet_id} className="border-b border-zinc-800/60 last:border-b-0">
                          <td className={`px-3 py-2 font-mono uppercase ${won ? "text-emerald-400" : "text-rose-400"}`}>
                            {won ? "WIN" : "LOSS"}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold">{b.ticker}</td>
                          <td className="px-3 py-2 font-mono uppercase text-zinc-400">
                            {b.edge_side} ({b.side})
                          </td>
                          <td className="px-3 py-2 text-right font-mono">${b.strike.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-mono text-zinc-300">
                            ${b.resolution?.actual_close?.toFixed(2) ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-zinc-500">
                            {fmtPp(b.model_edge_pp)}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono font-semibold ${won ? "text-emerald-400" : "text-rose-400"}`}>
                            {fmtUsd(b.resolution?.realized_pnl ?? 0, true)}
                          </td>
                          <td className="px-3 py-2 font-mono text-zinc-500">{b.close_date}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <footer className="text-xs text-zinc-500">
        Paper trading is a research artifact. Wins on near-certain (low-edge, high-prob)
        signals reflect base-rate accuracy, not model skill. See the{" "}
        <a href="/calibration" className="text-emerald-400 hover:underline">
          calibration page
        </a>{" "}
        for skill-adjusted analysis.
      </footer>
    </>
  );
}

function Kpi({
  label,
  value,
  hint,
  valueClass = "",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-xl font-semibold ${valueClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-zinc-500">{hint}</div>}
    </div>
  );
}
