"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Upload,
  Search,
  Network,
  Activity,
  ScrollText,
  Wrench,
} from "lucide-react";

const NAV = [
  { href: "/wiki", icon: BookOpen, label: "Wiki" },
  { href: "/wiki/graph", icon: Network, label: "Graph View" },
  { href: "/query", icon: Search, label: "Query" },
  { href: "/raw", icon: Upload, label: "Raw Sources" },
  { href: "/lint", icon: Wrench, label: "Lint" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-wiki-surface border-r border-wiki-border flex flex-col">
      <div className="p-5 border-b border-wiki-border">
        <div className="flex items-center gap-2.5">
          <ScrollText className="w-5 h-5 text-wiki-accent" />
          <span className="font-semibold text-wiki-text tracking-tight">LLM Wiki</span>
        </div>
        <p className="text-xs text-wiki-muted mt-1">Your knowledge base</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-wiki-accent/20 text-wiki-accent"
                  : "text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-wiki-border">
        <p className="text-xs text-wiki-muted">
          Powered by{" "}
          <span className="text-wiki-accent">Claude Sonnet</span>
        </p>
      </div>
    </aside>
  );
}
