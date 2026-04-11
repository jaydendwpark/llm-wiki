import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { extractOutboundLinks } from "@/lib/wiki/parser";
import { z } from "zod";

interface Params { params: Promise<{ slug: string }> }

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// PUT /api/wiki/[slug] — update a page
export async function PUT(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  try {
    const body = await request.json();
    const updates = UpdateSchema.parse(body);

    const serviceClient = createServiceClient();

    const { error } = await serviceClient
      .from("wiki_pages")
      .update(updates)
      .eq("slug", slug)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Rebuild wiki_links if content changed
    if (updates.content) {
      const outbound = extractOutboundLinks(updates.content);
      await serviceClient.from("wiki_links").delete().eq("from_slug", slug);
      if (outbound.length) {
        await serviceClient.from("wiki_links").insert(
          outbound.map((to) => ({ from_slug: slug, to_slug: to, user_id: user.id }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/wiki/[slug] — delete a page
export async function DELETE(request: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("wiki_pages")
    .delete()
    .eq("slug", slug)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
