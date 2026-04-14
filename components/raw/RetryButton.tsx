"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

type Status = "idle" | "loading" | "success" | "error";

export function RetryButton({ sourceId }: { sourceId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");

  const handleRetry = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setStatus("success");
      router.refresh();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return <CheckCircle className="w-3.5 h-3.5 text-wiki-ok" />;
  }

  return (
    <button
      onClick={handleRetry}
      disabled={status === "loading"}
      className="flex items-center gap-1 text-xs text-wiki-accent hover:text-wiki-accent/80 disabled:opacity-50 transition-colors"
    >
      {status === "loading" ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("import.retrying")}
        </>
      ) : (
        <>
          <RotateCw className="w-3 h-3" />
          {t("import.retry")}
        </>
      )}
    </button>
  );
}
