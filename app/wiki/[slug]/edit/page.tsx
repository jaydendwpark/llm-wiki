"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WikiRenderer } from "@/components/wiki/WikiRenderer";
import { ArrowLeft, Save, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function EditPage({ params }: Props) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLocale();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("wiki_pages")
      .select("title, content, summary, tags")
      .eq("slug", slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setContent(data.content);
          setSummary(data.summary ?? "");
          setTags((data.tags ?? []).join(", "));
        }
      });
  }, [slug]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/wiki/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          summary,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      router.push(`/wiki/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("edit.confirmDelete", { title }))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/wiki/${slug}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      router.push("/wiki");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <Link
          href={`/wiki/${slug}`}
          className="flex items-center gap-1.5 text-wiki-muted hover:text-wiki-text text-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t("edit.back")}
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 text-wiki-muted hover:text-wiki-text text-sm transition-colors"
          >
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? t("edit.edit") : t("edit.preview")}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-wiki-err hover:text-wiki-err text-sm transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t("edit.delete")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("edit.save")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-wiki-err-soft border border-wiki-err/20 rounded-lg px-4 py-3 text-wiki-err text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("edit.titlePlaceholder")}
          className="w-full bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3 text-xl font-bold text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors"
        />

        <div className="flex gap-4">
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={t("edit.summaryPlaceholder")}
            className="flex-1 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-2.5 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors"
          />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t("edit.tagsPlaceholder")}
            className="flex-1 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-2.5 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors"
          />
        </div>

        {preview ? (
          <div className="bg-wiki-surface border border-wiki-border rounded-xl p-8 min-h-96">
            <WikiRenderer content={content} />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("edit.contentPlaceholder")}
            className="w-full h-[60vh] bg-wiki-surface border border-wiki-border rounded-xl px-6 py-4 text-sm text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors font-mono resize-none"
          />
        )}
      </div>
    </div>
  );
}
