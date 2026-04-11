import { createClient } from "@/lib/supabase/server";
import { DropZone } from "@/components/raw/DropZone";
import { CheckCircle, Clock, FileText } from "lucide-react";

export const revalidate = 30;

export default async function RawPage() {
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("raw_sources")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-wiki-text mb-1">Raw Sources</h1>
        <p className="text-wiki-muted text-sm">
          Drop documents here. The LLM reads them and integrates knowledge into the wiki.
          Sources are immutable — the LLM never modifies them.
        </p>
      </div>

      <DropZone />

      {sources && sources.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xs text-wiki-muted uppercase tracking-widest font-semibold mb-4">
            Source history
          </h2>
          <div className="space-y-2">
            {sources.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3"
              >
                <FileText className="w-4 h-4 text-wiki-muted shrink-0" />
                <span className="text-sm text-wiki-text flex-1 truncate">{s.filename}</span>
                {s.ingested ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
                    <CheckCircle className="w-3 h-3" />
                    Ingested
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-wiki-muted shrink-0">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                )}
                <span className="text-xs text-wiki-muted shrink-0">
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
