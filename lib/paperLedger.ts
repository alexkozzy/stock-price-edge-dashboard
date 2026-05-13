/**
 * Reader + summary for paper_bets_open.jsonl and paper_bets_settled.jsonl
 * published by stock-price-edge into the data repo.
 *
 * Files are JSONL; each line is one bet row. We fetch them from GH Pages
 * (or fall back to undefined if SNAPSHOT_BASE_URL isn't set / file missing).
 */
import { z } from "zod";

export const ResolutionSchema = z.object({
  settled_at: z.string(),
  actual_close: z.number(),
  outcome_yes: z.boolean(),
  bet_won: z.boolean(),
  realized_pnl: z.number(),
});

export const PaperBetSchema = z.object({
  bet_id: z.string(),
  signal_key: z.string(),
  ticker: z.string(),
  side: z.enum(["above", "below"]),
  strike: z.number(),
  close_date: z.string(),
  edge_side: z.enum(["YES", "NO"]),
  entry_market_yes: z.number(),
  entry_price: z.number(),
  fair_yes: z.number(),
  model_edge_pp: z.number(),
  tradeable_edge_pp: z.number().nullable(),
  spread_pp: z.number().nullable(),
  stake_dollars: z.number(),
  shares: z.number(),
  liquidity_at_entry: z.number(),
  created_at: z.string(),
  snapshot_generated_at: z.string(),
  status: z.enum(["open", "settled_win", "settled_loss", "settled_void"]),
  resolution: ResolutionSchema.nullable(),
});

export type PaperBet = z.infer<typeof PaperBetSchema>;

async function fetchJsonl(url: string): Promise<PaperBet[]> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) return [];
  const text = await r.text();
  const out: PaperBet[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = PaperBetSchema.safeParse(JSON.parse(trimmed));
      if (parsed.success) out.push(parsed.data);
    } catch {
      // skip malformed line
    }
  }
  return out;
}

export async function loadPaperLedger(): Promise<{ open: PaperBet[]; settled: PaperBet[] }> {
  const base = process.env.SNAPSHOT_BASE_URL?.replace(/\/$/, "");
  if (!base) return { open: [], settled: [] };
  const [open, settled] = await Promise.all([
    fetchJsonl(`${base}/paper_bets_open.jsonl`),
    fetchJsonl(`${base}/paper_bets_settled.jsonl`),
  ]);
  return { open, settled };
}

export type LedgerSummary = {
  n_open: number;
  n_settled: number;
  n_won: number;
  n_lost: number;
  win_rate: number | null;
  total_staked_dollars: number;
  total_pnl_dollars: number;
  roi_pct: number | null;
  mean_pnl_per_bet: number | null;
  mean_edge_winners_pp: number | null;
  mean_edge_losers_pp: number | null;
};

export function summarize(open: PaperBet[], settled: PaperBet[]): LedgerSummary {
  const won = settled.filter((b) => b.status === "settled_win");
  const lost = settled.filter((b) => b.status === "settled_loss");
  const n_settled = settled.length;
  const total_pnl = settled.reduce(
    (acc, b) => acc + (b.resolution?.realized_pnl ?? 0),
    0,
  );
  const total_staked = settled.reduce((acc, b) => acc + b.stake_dollars, 0);
  const mean_edge_winners =
    won.length > 0
      ? won.reduce((acc, b) => acc + Math.abs(b.model_edge_pp), 0) / won.length
      : null;
  const mean_edge_losers =
    lost.length > 0
      ? lost.reduce((acc, b) => acc + Math.abs(b.model_edge_pp), 0) / lost.length
      : null;
  return {
    n_open: open.length,
    n_settled,
    n_won: won.length,
    n_lost: lost.length,
    win_rate: n_settled > 0 ? won.length / n_settled : null,
    total_staked_dollars: Math.round(total_staked * 100) / 100,
    total_pnl_dollars: Math.round(total_pnl * 100) / 100,
    roi_pct: total_staked > 0 ? Math.round((total_pnl / total_staked) * 10000) / 100 : null,
    mean_pnl_per_bet: n_settled > 0 ? Math.round((total_pnl / n_settled) * 100) / 100 : null,
    mean_edge_winners_pp: mean_edge_winners === null ? null : Math.round(mean_edge_winners * 100) / 100,
    mean_edge_losers_pp: mean_edge_losers === null ? null : Math.round(mean_edge_losers * 100) / 100,
  };
}

/**
 * Calibration buckets: for each predicted-probability bucket (0..1 in deciles),
 * compute realized win rate. Used by the /calibration page.
 */
export type CalibrationBucket = {
  lo: number;
  hi: number;
  n: number;
  mean_predicted: number;
  realized_win_rate: number;
};

export function calibrationBuckets(settled: PaperBet[], nBins: number = 10): CalibrationBucket[] {
  if (settled.length === 0) return [];
  // Per bet, the "predicted YES probability" we acted on:
  //   if edge_side = YES → fair_yes
  //   if edge_side = NO  → 1 - fair_yes  (our prob that the underlying ends NO)
  // "Won" maps to outcome matching our edge_side.
  const points = settled.map((b) => {
    const p = b.edge_side === "YES" ? b.fair_yes : 1 - b.fair_yes;
    const won = b.status === "settled_win";
    return { p, won };
  });
  const buckets: CalibrationBucket[] = [];
  for (let i = 0; i < nBins; i++) {
    const lo = i / nBins;
    const hi = (i + 1) / nBins;
    const inBin = points.filter((pt) =>
      i === nBins - 1 ? pt.p >= lo && pt.p <= hi : pt.p >= lo && pt.p < hi,
    );
    if (inBin.length === 0) continue;
    const meanP = inBin.reduce((a, b) => a + b.p, 0) / inBin.length;
    const realized = inBin.filter((p) => p.won).length / inBin.length;
    buckets.push({
      lo,
      hi,
      n: inBin.length,
      mean_predicted: Math.round(meanP * 1000) / 1000,
      realized_win_rate: Math.round(realized * 1000) / 1000,
    });
  }
  return buckets;
}
