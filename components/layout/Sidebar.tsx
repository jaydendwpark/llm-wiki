"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Upload, Search, Network, Activity, ScrollText, Wrench, Download, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SearchDialog } from "./SearchDialog";

const NAV = [
  { href: "/wiki",        icon: BookOpen, label: "Wiki" },
  { href: "/wiki/graph",  icon: Network,  label: "Graph View" },
  { href: "/query",       icon: Activity, label: "Query" },
  { href: "/raw",         icon: Upload,   label: "Raw Sources" },
  { href: "/lint",        icon: Wrench,   label: "Lint" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleExport = async () => {
    const res = await fetch("/api/export");
    const data = await res.json();
    if (!data.files) return;

    // Client-side: create individual .md file downloads as a JSON bundle
    const blob = new Blob([JSON.stringify(data.files, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wiki-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SearchDialog />
      <aside className="w-56 min-h-screen bg-wiki-surface border-r border-wiki-border flex flex-col shrink-0">
        <div className="p-5 border-b border-wiki-border">
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 text-wiki-accent" />
            <span className="font-semibold text-wiki-text tracking-tight">LLM Wiki</span>
          </div>
          <p className="text-xs text-wiki-muted mt-1">Your knowledge base</p>
        </div>

        {/* Search hint */}
        <button
          onClick={() => {
            const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
            window.dispatchEvent(event);
          }}
          className="mx-3 mt-3 flex items-center gap-2 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2 text-wiki-muted hover:text-wiki-text hover:border-wiki-accent/50 transition-colors text-xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1">Search…</span>
          <kbd className="text-xs bg-wiki-surface px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/wiki" && pathname.startsWith(href + "/")) || (href === "/wiki" && (pathname === "/wiki" || (pathname.startsWith("/wiki/") && !pathname.startsWith("/wiki/graph"))));
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

        <div className="p-3 border-t border-wiki-border space-y-1">
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-wiki-muted hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
