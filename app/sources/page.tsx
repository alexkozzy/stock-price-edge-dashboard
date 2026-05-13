import { gatherSourceHealth, type StatusDot } from "@/lib/sourceHealth";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export const metadata = {
  title: "Sources · Stock-price Edge",
};

const DOT: Record<StatusDot, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-400",
  gray: "bg-zinc-500",
};

const DOT_LABEL: Record<StatusDot, { text: string; cls: string }> = {
  green: { text: "online", cls: "text-emerald-400" },
  yellow: { text: "stale", cls: "text-amber-400" },
  red: { text: "down", cls: "text-rose-400" },
  gray: { text: "unconfigured", cls: "text-zinc-500" },
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default async function SourcesPage() {
  const health = await gatherSourceHealth();
  const green = health.providers.filter((p) => p.status_dot === "green").length;

  return (
    <>
      <section className="flex items-baseline justify-between border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Data sources</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            Server-side probes. Cached 30s.
          </p>
        </div>
        <div className="text-right">
          <div
            className={`font-mono text-2xl font-semibold ${green === health.providers.length ? "text-emerald-400" : "text-amber-400"}`}
          >
            {green}
            <span className="text-zinc-500">/{health.providers.length}</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">healthy</div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {health.providers.map((p) => (
          <article
            key={p.name}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5"
          >
            <header className="flex items-baseline justify-between">
              <h2 className="font-mono text-base font-semibold tracking-tight">
                {p.name}
              </h2>
              <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider">
                <span className={`inline-block size-2.5 rounded-full ${DOT[p.status_dot]}`} />
                <span className={DOT_LABEL[p.status_dot].cls}>{DOT_LABEL[p.status_dot].text}</span>
              </span>
            </header>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="uppercase tracking-wider text-zinc-500">Last success</dt>
                <dd className="mt-0.5 font-mono">{relativeTime(p.last_success_at)}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-zinc-500">Latency</dt>
                <dd className="mt-0.5 font-mono">{p.last_latency_ms === null ? "—" : `${p.last_latency_ms}ms`}</dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase tracking-wider text-zinc-500">Rate limit</dt>
                <dd className="mt-0.5 text-zinc-300">{p.rate_limit_note}</dd>
              </div>
            </dl>

            <section className="mt-4">
              <h3 className="text-xs uppercase tracking-wider text-zinc-500">Endpoints</h3>
              <ul className="mt-1 flex flex-wrap gap-1.5 font-mono text-[11px]">
                {p.endpoints.map((e) => (
                  <li key={e} className="rounded border border-zinc-700 bg-black/20 px-1.5 py-0.5 text-zinc-400">
                    {e}
                  </li>
                ))}
              </ul>
            </section>

            {p.last_error && (
              <section className="mt-4">
                <h3 className="text-xs uppercase tracking-wider text-rose-400">Last error</h3>
                <div className="mt-1 rounded border border-rose-400/40 bg-rose-400/5 p-2 font-mono text-[11px] text-rose-300">
                  {p.last_error.message}
                  <div className="mt-1 text-zinc-500">{relativeTime(p.last_error.at)}</div>
                </div>
              </section>
            )}

            {p.notes.length > 0 && (
              <section className="mt-4">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500">Notes</h3>
                <ul className="mt-1 space-y-1 text-xs text-zinc-500">
                  {p.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        ))}
      </section>

      <footer className="text-xs text-zinc-500 font-mono">
        probed {relativeTime(health.generated_at)} · {health.generated_at}
      </footer>
    </>
  );
}
