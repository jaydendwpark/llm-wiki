import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApiRequest } from "@/lib/utils/api-auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await validateApiRequest(request, "tasks");
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();
  const status = request.nextUrl.searchParams.getAll("status");

  let query = supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (status.length > 0) {
    query = query.in("status", status);
  }

  const { data, error } = await query.limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data });
}

export async function POST(request: NextRequest) {
  const auth = await validateApiRequest(request, "tasks");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: parsed.title,
        description: parsed.description ?? null,
        due_date: parsed.due_date ?? null,
        tags: parsed.tags ?? [],
        user_id: auth.userId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, task: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
