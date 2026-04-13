import { NextRequest, NextResponse } from "next/server";
import { runLint } from "@/lib/agents/lint";
import { validateApiRequest } from "@/lib/utils/api-auth";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const auth = await validateApiRequest(request, "lint");
  if (auth instanceof NextResponse) return auth;

  try {
    const locale = request.cookies.get("locale")?.value ?? "en";
    const result = await runLint(auth.userId, locale);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
