import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({ q: z.string().min(1).max(200) });

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parseResult = schema.safeParse({ q: searchParams.get("q") });

  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { q } = parseResult.data;

  const { data, error } = await supabase
    .from("wiki_pages")
    .select("slug, title, summary, tags")
    .textSearch("fts", q, { type: "websearch" })
    .eq("user_id", user.id)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ results: data ?? [] });
}
