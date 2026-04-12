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
  MessageCircle,
  MoreHorizontal,
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
  const [moreOpen, setMoreOpen] = useState(false);

  const NAV = [
    { href: "/",           icon: MessageCircle, label: t("nav.chat") },
    { href: "/wiki",       icon: BookOpen,      label: t("nav.wiki") },
    { href: "/raw",        icon: Sparkles,      label: t("nav.import") },
    { href: "/wiki/graph", icon: Network,       label: t("nav.graph") },
    { href: "/query",      icon: Activity,      label: t("nav.query") },
    { href: "/lint",       icon: Wrench,        label: t("nav.lint") },
  ];

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/auth")) return;
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => { if (d.limitUsd) setUsage(d); })
      .catch(() => {});
  }, [pathname]);

  // Close more menu on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = () => setMoreOpen(false);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [moreOpen]);

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

  const triggerSearch = () => {
    const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
    window.dispatchEvent(event);
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

      {/* ═══ Mobile: floating top header + nav pills ═══ */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden">
        {/* Row 1: Logo + utility buttons */}
        <div className="flex items-center justify-between px-4 h-12 bg-wiki-surface/80 backdrop-blur-xl border-b border-wiki-border/40">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-wiki-text tracking-tight">Mnemo</span>
          </Link>
          <div className="flex items-center">
            <button
              onClick={triggerSearch}
              className="p-2 rounded-lg text-wiki-muted hover:text-wiki-text transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLocale(locale === "en" ? "ko" : "en")}
              className="p-2 rounded-lg text-wiki-muted hover:text-wiki-text transition-colors"
            >
              <Globe className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMoreOpen(!moreOpen); }}
                className="p-2 rounded-lg text-wiki-muted hover:text-wiki-text transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl min-w-[9rem] overflow-hidden z-50">
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/30 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t("sidebar.export")}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("sidebar.signout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Nav pills */}
        <div className="flex gap-1.5 px-3 py-2 bg-wiki-bg/80 backdrop-blur-xl border-b border-wiki-border/30 overflow-x-auto scrollbar-hide">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                isActive(href)
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20"
                  : "text-wiki-muted hover:text-wiki-text hover:bg-wiki-surface/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ Desktop: sidebar ═══ */}
      <aside className="hidden md:flex w-56 min-h-screen bg-white/90 backdrop-blur-xl border-r border-wiki-border/40 flex-col shrink-0">
        <div className="p-5 border-b border-wiki-border/40">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <ScrollText className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-bold text-wiki-text tracking-tight">Mnemo</span>
              <p className="text-[10px] text-wiki-muted">mnemo.wiki</p>
            </div>
          </Link>
        </div>

        {/* Search */}
        <button
          onClick={triggerSearch}
          className="mx-3 mt-3 flex items-center gap-2 bg-wiki-bg/60 border border-wiki-border/40 rounded-xl px-3 py-2 text-wiki-muted hover:text-wiki-text hover:border-wiki-accent/40 transition-colors text-xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1">{t("sidebar.search")}</span>
          <kbd className="text-[10px] bg-wiki-surface px-1.5 py-0.5 rounded-md">{"\u2318"}K</kbd>
        </button>

        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive(href)
                  ? "bg-wiki-accent/15 text-wiki-accent shadow-sm"
                  : "text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Budget */}
        {usage && (
          <div className="mx-3 mb-2 px-3 py-2.5 bg-wiki-bg/60 border border-wiki-border/40 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-wiki-muted">{t("sidebar.budget")}</span>
              <span className="text-xs text-wiki-muted">{usage.month}</span>
            </div>
            <div className="h-1.5 bg-wiki-border/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                }`}
                style={{ width: `${pct.toFixed(1)}%` }}
              />
            </div>
            <p className="text-xs text-wiki-muted mt-1">{pct.toFixed(0)}%</p>
          </div>
        )}

        <div className="p-3 border-t border-wiki-border/40 space-y-0.5">
          <button
            onClick={() => setLocale(locale === "en" ? "ko" : "en")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/30 transition-colors"
          >
            <Globe className="w-4 h-4" />
            {locale === "en" ? "한국어" : "English"}
          </button>
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-wiki-muted hover:text-wiki-text hover:bg-wiki-border/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("sidebar.export")}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-wiki-muted hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("sidebar.signout")}
          </button>
        </div>
      </aside>
    </>
  );
}
