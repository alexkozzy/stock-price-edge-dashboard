/**
 * /calibration — reliability diagram for the model.
 *
 * For each decile of predicted probability, compare to the realized win rate.
 * A well-calibrated model produces points along y=x. Under-confident: points
 * below the diagonal. Over-confident: above.
 *
 * Requires settled paper bets. Empty state until enough have accumulated.
 */
import { loadPaperLedger, calibrationBuckets } from "@/lib/paperLedger";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Calibration · Stock-price Edge",
};

const MIN_BETS_FOR_DIAGRAM = 20;

export default async function CalibrationPage() {
  const ledger = await loadPaperLedger();
  const buckets = calibrationBuckets(ledger.settled, 10);
  const enough = ledger.settled.length >= MIN_BETS_FOR_DIAGRAM;

  return (
    <>
      <section className="flex items-baseline justify-between border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Calibration</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Predicted probability vs realized win rate, in deciles. Diagonal =
            perfect calibration. Below = under-confident. Above = over-confident.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold">
            {ledger.settled.length}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            settled bets
          </div>
        </div>
      </section>

      {!enough ? (
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          <p>
            <span className="font-semibold text-zinc-200">Not enough data yet.</span>{" "}
            The reliability diagram needs at least {MIN_BETS_FOR_DIAGRAM} settled
            bets ({ledger.settled.length}/{MIN_BETS_FOR_DIAGRAM} so far). The
            scheduler accrues ~2-5 settlements/day depending on which strikes hit
            their close date — give it about a week.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Until then, the <a href="/stats" className="text-emerald-400 hover:underline">stats page</a>{" "}
            shows running P&amp;L on whatever has settled.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
            <ReliabilityDiagram buckets={buckets} />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium tracking-tight">Bucket breakdown</h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-3 py-2 font-medium">Range</th>
                    <th className="px-3 py-2 text-right font-medium">n</th>
                    <th className="px-3 py-2 text-right font-medium">Mean predicted</th>
                    <th className="px-3 py-2 text-right font-medium">Realized win rate</th>
                    <th className="px-3 py-2 text-right font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => {
                    const diff = b.realized_win_rate - b.mean_predicted;
                    const sign = diff >= 0 ? "+" : "";
                    const color =
                      Math.abs(diff) < 0.05
                        ? "text-zinc-300"
                        : diff > 0
                          ? "text-emerald-400"
                          : "text-rose-400";
                    return (
                      <tr key={`${b.lo}`} className="border-b border-zinc-800/60 last:border-b-0">
                        <td className="px-3 py-2 font-mono">
                          {(b.lo * 100).toFixed(0)}–{(b.hi * 100).toFixed(0)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{b.n}</td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-300">
                          {(b.mean_predicted * 100).toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-300">
                          {(b.realized_win_rate * 100).toFixed(1)}%
                        </td>
                        <td className={`px-3 py-2 text-right font-mono ${color}`}>
                          {sign}{(diff * 100).toFixed(1)}pp
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function ReliabilityDiagram({ buckets }: { buckets: { mean_predicted: number; realized_win_rate: number; n: number }[] }) {
  // SVG-only chart — no recharts dep on this project (deliberate keep-small).
  // Domain 0..1 on both axes; data points sized by n.
  const size = 420;
  const pad = 36;
  const usable = size - pad * 2;
  const x = (p: number) => pad + p * usable;
  const y = (p: number) => size - pad - p * usable;
  const maxN = buckets.reduce((m, b) => (b.n > m ? b.n : m), 1);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Reliability diagram"
      className="w-full max-w-md text-zinc-500"
    >
      {/* axes */}
      <line x1={pad} y1={size - pad} x2={size - pad} y2={size - pad} stroke="currentColor" strokeWidth={1} />
      <line x1={pad} y1={pad} x2={pad} y2={size - pad} stroke="currentColor" strokeWidth={1} />

      {/* y=x reference */}
      <line
        x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)}
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeDasharray="4 4"
        strokeWidth={1}
      />

      {/* axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={size - pad} x2={x(v)} y2={size - pad + 4} stroke="currentColor" />
          <text
            x={x(v)}
            y={size - pad + 16}
            fontSize={10}
            fill="currentColor"
            textAnchor="middle"
          >
            {(v * 100).toFixed(0)}%
          </text>
          <line x1={pad - 4} y1={y(v)} x2={pad} y2={y(v)} stroke="currentColor" />
          <text
            x={pad - 6}
            y={y(v) + 3}
            fontSize={10}
            fill="currentColor"
            textAnchor="end"
          >
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* axis labels */}
      <text x={size / 2} y={size - 6} fontSize={11} fill="currentColor" textAnchor="middle">
        Predicted probability
      </text>
      <text
        x={12}
        y={size / 2}
        fontSize={11}
        fill="currentColor"
        textAnchor="middle"
        transform={`rotate(-90 12 ${size / 2})`}
      >
        Realized win rate
      </text>

      {/* points */}
      {buckets.map((b) => {
        const radius = 3 + (b.n / maxN) * 8;
        return (
          <circle
            key={`${b.mean_predicted}-${b.n}`}
            cx={x(b.mean_predicted)}
            cy={y(b.realized_win_rate)}
            r={radius}
            fill="rgb(52 211 153 / 0.85)"
            stroke="rgb(16 185 129)"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}
