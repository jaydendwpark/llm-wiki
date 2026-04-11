import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/agents/ingest";
import { z } from "zod";

const schema = z.object({ sourceId: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId } = schema.parse(body);

    const result = await runIngest(sourceId);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
