import { QueryInterface } from "@/components/query/QueryInterface";
import { createClient } from "@/lib/supabase/server";

export default async function QueryPage() {
  const supabase = await createClient();
  const { data: recentQueries } = await supabase
    .from("wiki_logs")
    .select("title, details, created_at")
    .eq("operation", "query")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-wiki-text mb-1">Query</h1>
        <p className="text-wiki-muted text-sm">
          Ask questions against your wiki. Great answers are automatically filed back as new pages.
        </p>
      </div>

      <QueryInterface />

      {recentQueries && recentQueries.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xs text-wiki-muted uppercase tracking-widest font-semibold mb-4">
            Recent queries
          </h2>
          <div className="space-y-2">
            {recentQueries.map((q, i) => (
              <div
                key={i}
                className="bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3"
              >
                <p className="text-sm text-wiki-text">{q.title}</p>
                {(q.details as { filedSlug?: string })?.filedSlug && (
                  <a
                    href={`/wiki/${(q.details as { filedSlug: string }).filedSlug}`}
                    className="text-xs text-wiki-link hover:text-wiki-link-hover mt-1 inline-block"
                  >
                    Filed → {(q.details as { filedSlug: string }).filedSlug}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
