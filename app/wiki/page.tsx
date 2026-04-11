import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Network, Plus } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export const revalidate = 60;

export default async function WikiIndexPage() {
  const t = await getT();
  const supabase = await createClient();
  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("slug, title, summary, tags, updated_at, source_count")
    .order("updated_at", { ascending: false });

  const grouped = new Map<string, typeof pages>();
  for (const page of pages ?? []) {
    const tag = page.tags[0] ?? "General";
    if (!grouped.has(tag)) grouped.set(tag, []);
    grouped.get(tag)!.push(page);
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-wiki-text mb-1">{t("wiki.title")}</h1>
          <p className="text-wiki-muted">
            {t("wiki.subtitle", { count: pages?.length ?? 0 })}
          </p>
        </div>
        <Link
          href="/wiki/graph"
          className="flex items-center gap-2 bg-wiki-surface border border-wiki-border hover:border-wiki-accent/50 rounded-lg px-4 py-2 text-sm text-wiki-muted hover:text-wiki-text transition-colors"
        >
          <Network className="w-4 h-4" />
          {t("wiki.graphView")}
        </Link>
      </div>

      {pages?.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-wiki-muted" />
          <p className="text-wiki-text font-medium mb-2">{t("wiki.empty")}</p>
          <p className="text-wiki-muted text-sm mb-6">{t("wiki.emptyDesc")}</p>
          <Link
            href="/raw"
            className="inline-flex items-center gap-2 bg-wiki-accent hover:bg-wiki-accent/80 text-white px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("wiki.addSource")}
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].sort().map(([tag, tagPages]) => (
            <section key={tag}>
              <h2 className="text-xs text-wiki-muted uppercase tracking-widest font-semibold mb-3">
                {tag}
              </h2>
              <div className="space-y-1">
                {(tagPages ?? []).map((page) => (
                  <Link
                    key={page.slug}
                    href={`/wiki/${page.slug}`}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-wiki-surface transition-colors group"
                  >
                    <BookOpen className="w-4 h-4 text-wiki-muted group-hover:text-wiki-accent mt-0.5 shrink-0 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-wiki-text group-hover:text-wiki-link transition-colors font-medium truncate">
                        {page.title}
                      </p>
                      {page.summary && (
                        <p className="text-wiki-muted text-sm truncate mt-0.5">{page.summary}</p>
                      )}
                    </div>
                    <span className="text-xs text-wiki-muted ml-auto shrink-0">
                      {new Date(page.updated_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
