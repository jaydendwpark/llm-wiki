import { createClient } from "@/lib/supabase/server";
import { CheckCircle, Clock, FileText, Upload } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";

export const revalidate = 30;

export default async function UploadHistoryPage() {
  const t = await getT();
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("raw_sources")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-wiki-text mb-1">{t("import.title")}</h1>
        <p className="text-wiki-muted text-sm">{t("import.desc")}</p>
      </div>

      {!sources || sources.length === 0 ? (
        <div className="text-center py-20">
          <Upload className="w-12 h-12 mx-auto mb-4 text-wiki-muted" />
          <p className="text-wiki-text font-medium mb-2">{t("import.empty")}</p>
          <p className="text-wiki-muted text-sm mb-6">{t("import.emptyDesc")}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-wiki-accent hover:bg-wiki-accent/80 text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {t("import.goHome")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3"
            >
              <FileText className="w-4 h-4 text-wiki-muted shrink-0" />
              <span className="text-sm text-wiki-text flex-1 truncate">{s.filename}</span>
              {s.ingested ? (
                <span className="flex items-center gap-1.5 text-xs text-wiki-ok shrink-0">
                  <CheckCircle className="w-3 h-3" />
                  {t("import.ingested")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-wiki-muted shrink-0">
                  <Clock className="w-3 h-3" />
                  {t("import.pending")}
                </span>
              )}
              <span className="text-xs text-wiki-muted shrink-0">
                {new Date(s.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
