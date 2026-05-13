/**
 * Lightweight health probes for the two upstream sources this project uses:
 *   - Polymarket gamma-api (no auth, public)
 *   - Yahoo Finance / yfinance (no auth, public)
 *
 * Cached server-side at module level for HEALTH_TTL_MS to keep page loads
 * cheap. Each probe records latency + last-success timestamp + last error.
 */
const HEALTH_TTL_MS = 30_000;

export type StatusDot = "green" | "yellow" | "red" | "gray";

export type ProviderHealth = {
  name: string;
  ok: boolean;
  status_dot: StatusDot;
  last_success_at: string | null;
  last_latency_ms: number | null;
  last_error: { message: string; at: string } | null;
  rate_limit_note: string;
  endpoints: string[];
  notes: string[];
};

type CacheEntry = { value: AllHealth; expires_at: number };
let cached: CacheEntry | null = null;

export type AllHealth = {
  generated_at: string;
  providers: ProviderHealth[];
};

async function timedFetch(url: string): Promise<{ ok: boolean; status: number; ms: number; body?: string }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { cache: "no-store" });
    const ms = Date.now() - t0;
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return { ok: false, status: r.status, ms, body: body.slice(0, 200) };
    }
    return { ok: true, status: r.status, ms };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, body: e instanceof Error ? e.message : "unknown" };
  }
}

async function probePolymarket(): Promise<ProviderHealth> {
  const res = await timedFetch(
    "https://gamma-api.polymarket.com/events?tag_slug=stocks&limit=1&active=true",
  );
  const now = new Date().toISOString();
  return {
    name: "Polymarket Gamma API",
    ok: res.ok,
    status_dot: res.ok ? "green" : "red",
    last_success_at: res.ok ? now : null,
    last_latency_ms: res.ms,
    last_error: res.ok ? null : { message: `HTTP ${res.status}: ${res.body ?? ""}`, at: now },
    rate_limit_note: "Public, no published limit. This is the signal feed.",
    endpoints: ["/events?tag_slug=stocks", "/events?tag_slug=stock-prices"],
    notes: [],
  };
}

async function probeYahoo(): Promise<ProviderHealth> {
  // yfinance ultimately scrapes query1/query2.finance.yahoo.com. The /v7/quote
  // endpoint now returns 401 without a crumb; /v8/chart still works
  // unauthenticated, which is what yfinance falls back to for history.
  const res = await timedFetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=5d",
  );
  const now = new Date().toISOString();
  return {
    name: "Yahoo Finance (yfinance)",
    ok: res.ok,
    status_dot: res.ok ? "green" : "red",
    last_success_at: res.ok ? now : null,
    last_latency_ms: res.ms,
    last_error: res.ok ? null : { message: `HTTP ${res.status}: ${res.body ?? ""}`, at: now },
    rate_limit_note: "Unofficial public API. Yahoo throttles aggressively without warning.",
    endpoints: ["v7/finance/quote", "v8/finance/chart (history)"],
    notes: [
      "yfinance is the python wrapper around Yahoo's undocumented APIs; treat 5xx / empty responses as throttle signals, not real outages.",
    ],
  };
}

export async function gatherSourceHealth(): Promise<AllHealth> {
  const now = Date.now();
  if (cached && cached.expires_at > now) return cached.value;

  const [pm, yh] = await Promise.all([probePolymarket(), probeYahoo()]);
  const value: AllHealth = {
    generated_at: new Date().toISOString(),
    providers: [pm, yh],
  };
  cached = { value, expires_at: now + HEALTH_TTL_MS };
  return value;
}
