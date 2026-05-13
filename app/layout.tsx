import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavTabs } from "@/components/NavTabs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock-price Edge",
  description: "Polymarket daily/weekly close-price edge scanner — sibling to earnings-edge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-950">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-baseline gap-3">
              <span className="text-base font-semibold tracking-tight">
                Stock-price Edge
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Polymarket close-price scanner
              </span>
            </div>
            <NavTabs />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-[11px] text-zinc-500">
          <div className="mx-auto max-w-7xl">
            Read-only. Not investment advice. Edges are model hypotheses against
            Polymarket close prices, NOT recommendations to trade.
          </div>
        </footer>
      </body>
    </html>
  );
}
