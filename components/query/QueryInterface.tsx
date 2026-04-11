"use client";

import { useState } from "react";
import { Send, BookmarkPlus, Loader2 } from "lucide-react";
import { WikiRenderer } from "@/components/wiki/WikiRenderer";

interface QueryResult {
  answer: string;
  citedPages: string[];
  shouldFile: boolean;
  filedPage: { slug: string; title: string } | null;
}

export function QueryInterface() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about your wiki…"
          className="flex-1 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3 text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error && (
        <div className="bg-red-950/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-wiki-surface border border-wiki-border rounded-xl p-6 space-y-4">
          <WikiRenderer content={result.answer} />

          {result.citedPages.length > 0 && (
            <div className="pt-4 border-t border-wiki-border">
              <p className="text-xs text-wiki-muted uppercase tracking-wider mb-2">Sources</p>
              <div className="flex flex-wrap gap-2">
                {result.citedPages.map((slug) => (
                  <a
                    key={slug}
                    href={`/wiki/${slug}`}
                    className="text-xs bg-wiki-bg border border-wiki-border rounded px-2 py-1 text-wiki-link hover:text-wiki-link-hover transition-colors"
                  >
                    {slug}
                  </a>
                ))}
              </div>
            </div>
          )}

          {result.filedPage && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm pt-2">
              <BookmarkPlus className="w-4 h-4" />
              Filed as{" "}
              <a href={`/wiki/${result.filedPage.slug}`} className="underline hover:text-emerald-300">
                {result.filedPage.title}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
