import { NextRequest, NextResponse } from "next/server";
import { runLint } from "@/lib/agents/lint";

export async function POST(_request: NextRequest) {
  try {
    const result = await runLint();
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
