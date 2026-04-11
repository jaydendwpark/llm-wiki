import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

type Operation = keyof typeof LIMITS;

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Validates auth and rate limit for an API route.
 * Returns { userId } on success, or a NextResponse error to return immediately.
 */
export async function validateApiRequest(
  request: NextRequest,
  operation: Operation
): Promise<{ userId: string } | NextResponse> {
  // Rate limit check
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

  return { userId: user.id };
}
