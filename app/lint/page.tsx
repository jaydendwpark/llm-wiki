"use client";

import { useState } from "react";
import { Wrench, Loader2, AlertTriangle, Info, XCircle } from "lucide-react";
import type { LintIssue } from "@/lib/agents/lint";
import { useLocale } from "@/lib/i18n/context";

const SEVERITY_ICON = {
  error: <XCircle className="w-4 h-4 text-red-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
};

const SEVERITY_BG = {
  error: "border-red-800/50 bg-red-950/20",
  warning: "border-amber-700/50 bg-amber-950/20",
  info: "border-blue-800/50 bg-blue-950/20",
};

export default function LintPage() {
  const { t } = useLocale();
  const [running, setRunning] = useState(false);
  const [issues, setIssues] = useState<LintIssue[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runLint = async () => {
    setRunning(true);
    setError(null);
    setIssues(null);
    setSummary(null);

    try {
      const res = await fetch("/api/lint", { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setIssues(data.result.issues);
      setSummary(data.result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lint failed");
    } finally {
      setRunning(false);
    }
  };

  const errorCount = issues?.filter((i) => i.severity === "error").length ?? 0;
  const warningCount = issues?.filter((i) => i.severity === "warning").length ?? 0;
  const infoCount = issues?.filter((i) => i.severity === "info").length ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-wiki-text mb-1">{t("lint.title")}</h1>
        <p className="text-wiki-muted text-sm">{t("lint.desc")}</p>
      </div>

      <button
        onClick={runLint}
        disabled={running}
        className="flex items-center gap-2 bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors font-medium"
      >
        {running ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wrench className="w-4 h-4" />
        )}
        {running ? t("lint.running") : t("lint.run")}
      </button>

      {error && (
        <div className="mt-6 bg-red-950/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {issues !== null && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t("lint.errors"), count: errorCount, color: "text-red-400" },
              { label: t("lint.warnings"), count: warningCount, color: "text-amber-400" },
              { label: t("lint.info"), count: infoCount, color: "text-blue-400" },
            ].map(({ label, count, color }) => (
              <div key={label} className="bg-wiki-surface border border-wiki-border rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-wiki-muted mt-1">{label}</p>
              </div>
            ))}
          </div>

          {summary && (
            <div className="bg-wiki-surface border border-wiki-border rounded-lg p-4">
              <p className="text-sm text-wiki-muted">{summary}</p>
            </div>
          )}

          {issues.length === 0 ? (
            <p className="text-center text-wiki-muted py-8">{t("lint.healthy")}</p>
          ) : (
            <div className="space-y-3">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-4 ${SEVERITY_BG[issue.severity]}`}
                >
                  <div className="flex items-start gap-3">
                    {SEVERITY_ICON[issue.severity]}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a href={`/wiki/${issue.slug}`} className="text-sm font-medium text-wiki-link hover:text-wiki-link-hover">
                          {issue.slug}
                        </a>
                        <span className="text-xs text-wiki-muted capitalize bg-wiki-bg rounded px-1.5 py-0.5">
                          {issue.type}
                        </span>
                      </div>
                      <p className="text-sm text-wiki-text">{issue.description}</p>
                      <p className="text-xs text-wiki-muted mt-1">{issue.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
