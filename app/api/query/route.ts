import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/agents/query";
import { validateApiRequest } from "@/lib/utils/api-auth";
import { z } from "zod";

export const maxDuration = 120;

const schema = z.object({ question: z.string().min(1).max(2000) });

export async function POST(request: NextRequest) {
  const auth = await validateApiRequest(request, "query");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { question } = schema.parse(body);
    const locale = request.cookies.get("locale")?.value ?? "en";
    const result = await runQuery(question, auth.userId, locale);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
