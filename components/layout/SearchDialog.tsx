"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, BookOpen } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface SearchResult {
  slug: string;
  title: string;
  summary?: string;
  tags: string[];
}

export function SearchDialog() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSelected(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(e.target.value), 250);
  };

  const navigate = (slug: string) => {
    router.push(`/wiki/${slug}`);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) navigate(results[selected].slug);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-wiki-surface border border-wiki-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-wiki-border">
          <Search className="w-4 h-4 text-wiki-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={t("search.placeholder")}
            className="flex-1 bg-transparent text-wiki-text placeholder-wiki-muted focus:outline-none text-sm"
          />
          {loading && (
            <span className="text-xs text-wiki-muted">{t("search.searching")}</span>
          )}
          <button onClick={() => setOpen(false)} className="text-wiki-muted hover:text-wiki-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {results.length > 0 && (
          <ul className="py-2 max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <li key={r.slug}>
                <button
                  onClick={() => navigate(r.slug)}
                  className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? "bg-wiki-accent/20" : "hover:bg-wiki-border/40"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-wiki-muted mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-wiki-text font-medium truncate">{r.title}</p>
                    {r.summary && (
                      <p className="text-xs text-wiki-muted truncate mt-0.5">{r.summary}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query && !loading && results.length === 0 && (
          <p className="text-center text-wiki-muted text-sm py-8">
            {t("search.noResults", { query })}
          </p>
        )}

        <div className="px-4 py-2 border-t border-wiki-border flex gap-4 text-xs text-wiki-muted">
          <span><kbd className="bg-wiki-bg px-1.5 py-0.5 rounded text-xs">\u2191\u2193</kbd> {t("search.navigate")}</span>
          <span><kbd className="bg-wiki-bg px-1.5 py-0.5 rounded text-xs">\u21b5</kbd> {t("search.open")}</span>
          <span><kbd className="bg-wiki-bg px-1.5 py-0.5 rounded text-xs">esc</kbd> {t("search.close")}</span>
        </div>
      </div>
    </div>
  );
}
