/**
 * Canonical schema for stock-price-edge signals.
 *
 * One row per (ticker × close_date × strike × side) sub-market on Polymarket.
 * Stocks have multi-strike events — same ticker + close date appears N times
 * with different strikes. Grouping for UI happens at render time.
 *
 * Runtime validation via the Zod schemas below; the home-page loader returns
 * 500 on schema mismatch rather than rendering garbage.
 */
import { z } from "zod";

export const SideEnum = z.enum(["above", "below"]);
export type Side = z.infer<typeof SideEnum>;

export const StockSignalSchema = z.object({
  ticker: z.string().min(1).max(10),
  side: SideEnum,
  /** Strike in USD. */
  strike: z.number().positive(),
  /** Close date YYYY-MM-DD. */
  close_date: z.string().min(8),
  /** Trading-day fraction until resolution. */
  days: z.number().nonnegative(),
  /** Spot at signal time. */
  spot: z.number().positive(),
  /** Annualized vol used by the model. v2+: derived from IV when available. */
  sigma_used: z.number().nonnegative().optional(),
  /** Source of sigma: "iv_target" | "rv_30d" | "rv_60d". */
  sigma_source: z.string().optional(),
  /** Legacy alias from schema v1 — kept for old snapshots. */
  sigma_30d: z.number().nonnegative().optional(),
  /** 30d annualized realized vol (diagnostic, always present in v2). */
  rv_30d: z.number().nonnegative().nullable().optional(),
  /** 60d annualized realized vol (diagnostic). */
  rv_60d: z.number().nonnegative().nullable().optional(),
  /** ATM IV at the option expiry closest to close_date. */
  iv_atm_target: z.number().nonnegative().nullable().optional(),
  /** ATM IV at the nearest option expiry. */
  iv_atm_front: z.number().nonnegative().nullable().optional(),
  /** ATM IV at the back-month (~35d out) expiry. */
  iv_atm_back: z.number().nonnegative().nullable().optional(),
  /** iv_atm_back − iv_atm_front. Positive = contango. */
  iv_term_slope: z.number().nullable().optional(),
  /** Put-OTM IV − Call-OTM IV at the front expiry. Positive = crash premium. */
  iv_skew: z.number().nullable().optional(),
  /** ISO date of the expiry used for iv_atm_target. */
  iv_target_expiry: z.string().nullable().optional(),
  /** Model P(YES) — accounts for side (above/below). */
  fair_yes: z.number().min(0).max(1),
  /** Polymarket YES price 0..1. */
  market_yes: z.number().min(0).max(1),
  /** (fair_yes − market_yes) × 100, signed. */
  edge_pp: z.number(),
  /** Polymarket bid/ask spread in pp. */
  spread_pp: z.number().nullable(),
  /** sign(edge_pp) × max(0, |edge_pp| − spread_pp). */
  tradeable_edge_pp: z.number().nullable(),
  /** Polymarket event-level liquidity. */
  liquidity: z.number().nonnegative(),
  /** 24h volume on this sub-market. */
  vol_24h: z.number().nonnegative(),
  event_slug: z.string(),
  market_id: z.string(),
});

export type StockSignal = z.infer<typeof StockSignalSchema>;

export const StockEdgeSnapshotSchema = z.object({
  generated_at: z.string(),
  /** v1 = realized-vol only; v2 = IV-aware (Wave 2 / Path C). */
  schema_version: z.union([z.literal(1), z.literal(2)]),
  universe: z.array(z.string()),
  n_scored: z.number().int().nonnegative(),
  filter: z.object({
    min_liquidity_usd: z.number(),
    min_abs_edge_pp: z.number(),
  }),
  signals: z.array(StockSignalSchema),
});

export type StockEdgeSnapshot = z.infer<typeof StockEdgeSnapshotSchema>;

/** Threshold above which we colour an edge as "actually tradeable". */
export const TRADEABLE_FLOOR_PP = 1.0;
