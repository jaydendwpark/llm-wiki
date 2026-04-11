import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { checkCostLimit } from "@/lib/usage/tracker";

type Operation = keyof typeof LIMITS;

/** LLM operations that consume budget — rate-limited ops that aren't LLM calls are excluded. */
const LLM_OPERATIONS = new Set<Operation>(["ingest", "query", "lint"]);

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Validates auth, rate limit, and monthly cost limit for an API route.
 * Returns { userId } on success, or a NextResponse error to return immediately.
 */
export async function validateApiRequest(
  request: NextRequest,
  operation: Operation
): Promise<{ userId: string } | NextResponse> {
  // Rate limit check (per-IP)
  const ip = getIp(request);
  const { allowed, retryAfterMs } = checkRateLimit(`${operation}:${ip}`, LIMITS[operation]);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfterMs },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((retryAfterMs ?? 60000) / 1000)) },
      }
    );
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Monthly cost limit check (only for LLM operations)
  if (LLM_OPERATIONS.has(operation)) {
    const costCheck = await checkCostLimit(user.id);
    if (!costCheck.allowed) {
      return NextResponse.json(
        {
          error: "Monthly cost limit reached",
          limitUsd: costCheck.limitUsd,
          spentUsd: costCheck.spentUsd,
          message: `You've used $${costCheck.spentUsd.toFixed(4)} of your $${costCheck.limitUsd.toFixed(2)}/month budget.`,
        },
        { status: 402 }
      );
    }
  }

  return { userId: user.id };
}
