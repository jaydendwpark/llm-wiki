import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIndexMarkdown } from "@/lib/wiki/index-manager";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select("slug, title, content, summary, tags, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (!pages?.length) {
    return NextResponse.json({ error: "No pages to export" }, { status: 404 });
  }

  // Build index.md
  const indexMd = buildIndexMarkdown(
    pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary ?? "",
      tags: p.tags ?? [],
      updatedAt: p.updated_at,
    }))
  );

  // Create a ZIP file with all wiki pages + index
  // Using a simple multi-part boundary since we can't use JSZip without install
  // Returns JSON with all file contents for client-side ZIP creation
  const files: Record<string, string> = { "index.md": indexMd };
  for (const page of pages) {
    files[`${page.slug}.md`] = page.content;
  }

  return NextResponse.json({ files, pageCount: pages.length });
}
