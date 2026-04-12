"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Network,
  Activity,
  Wrench,
  Download,
  LogOut,
  Sparkles,
  Globe,
  ScrollText,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SearchDialog } from "./SearchDialog";
import { useLocale } from "@/lib/i18n/context";

interface UsageSummary {
  month: string;
  plan: string;
  limitUsd: number;
  spentUsd: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV = [
    { href: "/",           icon: MessageCircle, label: t("nav.chat") },
    { href: "/wiki",       icon: BookOpen,      label: t("nav.wiki") },
    { href: "/wiki/graph", icon: Network,       label: t("nav.graph") },
    { href: "/query",      icon: Activity,      label: t("nav.query") },
    { href: "/raw",        icon: Sparkles,      label: t("nav.import") },
    { href: "/lint",       icon: Wrench,        label: t("nav.lint") },
  ];

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/auth")) return;
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => { if (d.limitUsd) setUsage(d); })
      .catch(() => {});
  }, [pathname]);

  // Close sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname === "/login" || pathname.startsWith("/auth")) return null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleExport = async () => {
    const res = await fetch("/api/export");
    const data = await res.json();
    if (!data.files) return;

    const blob = new Blob([JSON.stringify(data.files, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wiki-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pct = usage ? Math.min(100, (usage.spentUsd / usage.limitUsd) * 100) : 0;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/wiki") return pathname === "/wiki" || (pathname.startsWith("/wiki/") && !pathname.startsWith("/wiki/graph"));
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      <SearchDialog />

      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-wiki-surface border-b border-wiki-border flex items-center px-4 z-40 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-wiki-muted hover:text-wiki-text transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 ml-3">
          <ScrollText className="w-4 h-4 text-wiki-accent" />
          <span className="font-semibold text-wiki-text text-sm tracking-tight">Mnemo</span>
        </Link>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-56 bg-wiki-surface border-r border-wiki-border flex flex-col z-50 transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-wiki-border flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2.5">
              <ScrollText className="w-5 h-5 text-wiki-accent" />
              <span className="font-semibold text-wiki-text tracking-tight">Mnemo</span>
            </div>
            <p className="text-xs text-wiki-muted mt-1">mnemo.wiki</p>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-wiki-muted hover:text-wiki-text transition-colors md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search hint */}
        <button
          onClick={() => {
            setMobileOpen(false);
            const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
            window.dispatchEvent(event);
          }}
          className="mx-3 mt-3 flex items-center gap-2 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2 text-wiki-muted hover:text-wiki-text hover:border-wiki-accent/50 transition-colors text-xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1">{t("sidebar.search")}</span>
          <kbd className="text-xs bg-wiki-surface px-1.5 py-0.5 rounded">{"\u2318"}K</kbd>
        </button>

        <nav className="flex-1 p-3 space-y-1 mt-2">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(href)
                  ? "bg-wiki-accent/20 text-wiki-accent"
                  : "text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Monthly budget widget */}
        {usage && (
          <div className="mx-3 mb-2 px-3 py-2.5 bg-wiki-bg border border-wiki-border rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-wiki-muted">{t("sidebar.budget")}</span>
              <span className="text-xs text-wiki-muted">{usage.month}</span>
            </div>
            <div className="h-1.5 bg-wiki-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct > 90
                    ? "bg-red-500"
                    : pct > 70
                    ? "bg-yellow-500"
                    : "bg-wiki-accent"
                }`}
                style={{ width: `${pct.toFixed(1)}%` }}
              />
            </div>
            <p className="text-xs text-wiki-muted mt-1">
              {pct.toFixed(0)}%
            </p>
          </div>
        )}

        <div className="p-3 border-t border-wiki-border space-y-1">
          <button
            onClick={() => setLocale(locale === "en" ? "ko" : "en")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/50 transition-colors"
          >
            <Globe className="w-4 h-4" />
            {locale === "en" ? "한국어" : "English"}
          </button>
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/50 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("sidebar.export")}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-wiki-muted hover:text-red-400 hover:bg-red-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("sidebar.signout")}
          </button>
        </div>
      </aside>
    </>
  );
}
