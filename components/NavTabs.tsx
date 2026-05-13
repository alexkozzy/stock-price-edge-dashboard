"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Edge table" },
  { href: "/stats", label: "Stats" },
  { href: "/calibration", label: "Calibration" },
  { href: "/sources", label: "Sources" },
] as const;

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "bg-zinc-800 text-emerald-400"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
