import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/agents/query";
import { z } from "zod";

const schema = z.object({ question: z.string().min(1).max(2000) });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = schema.parse(body);

    const result = await runQuery(question);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
