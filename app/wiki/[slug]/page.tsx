import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WikiRenderer } from "@/components/wiki/WikiRenderer";
import { ArrowLeft, Clock, Tag, Link2, Pencil } from "lucide-react";
import { getLocale } from "@/lib/i18n/server";
import { createT } from "@/lib/i18n/translations";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WikiPageRoute({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = createT(locale);
  const supabase = await createClient();

  const [{ data: page }, { data: inboundLinks }] = await Promise.all([
    supabase.from("wiki_pages").select("*").eq("slug", slug).single(),
    supabase
      .from("wiki_links")
      .select("from_slug, wiki_pages!wiki_links_from_slug_fkey(title)")
      .eq("to_slug", slug),
  ]);

  if (!page) notFound();

  const dateFmt = locale === "ko" ? "ko" : "en";

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <Link
        href="/wiki"
        className="inline-flex items-center gap-1.5 text-wiki-muted hover:text-wiki-text text-sm mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("wiki.allPages")}
      </Link>

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-4xl font-bold text-wiki-text">{page.title}</h1>
          <Link
            href={`/wiki/${slug}/edit`}
            className="shrink-0 flex items-center gap-1.5 text-wiki-muted hover:text-wiki-text text-sm border border-wiki-border hover:border-wiki-accent/50 rounded-lg px-3 py-1.5 transition-colors mt-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("wiki.edit")}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-wiki-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {new Date(page.updated_at).toLocaleDateString(dateFmt, {
              year: "numeric", month: "long", day: "numeric",
            })}
          </span>

          {page.tags?.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {page.tags.join(", ")}
            </span>
          )}
        </div>
      </header>

      <article className="bg-wiki-surface border border-wiki-border rounded-xl p-8">
        <WikiRenderer content={page.content} />
      </article>

      {inboundLinks && inboundLinks.length > 0 && (
        <section className="mt-8">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-wiki-muted uppercase tracking-wider mb-3">
            <Link2 className="w-4 h-4" />
            {t("wiki.linkedFrom")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {inboundLinks.map((l) => {
              const linkedPage = l.wiki_pages as unknown as { title: string } | null;
              return (
                <Link
                  key={l.from_slug}
                  href={`/wiki/${l.from_slug}`}
                  className="text-sm bg-wiki-surface border border-wiki-border rounded-lg px-3 py-1.5 text-wiki-link hover:text-wiki-link-hover hover:border-wiki-accent/50 transition-colors"
                >
                  {linkedPage?.title ?? l.from_slug}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
