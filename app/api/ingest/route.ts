import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/agents/ingest";
import { validateApiRequest } from "@/lib/utils/api-auth";
import { z } from "zod";

export const maxDuration = 300;

const schema = z.object({ sourceId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const auth = await validateApiRequest(request, "ingest");
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { sourceId } = schema.parse(body);
    const result = await runIngest(sourceId, auth.userId);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ingest] error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
