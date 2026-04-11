/**
 * Per-user monthly usage tracking.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { calculateCostUsd, TokenCounts } from "./pricing";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);  // "YYYY-MM"
}

export async function recordUsage(
  userId: string,
  operation: "ingest" | "query" | "lint",
  tokens: TokenCounts
): Promise<void> {
  const supabase = createServiceClient();
  const costUsd = calculateCostUsd(tokens);

  await supabase.rpc("increment_user_usage", {
    p_user_id:     userId,
    p_month:       currentMonth(),
    p_operation:   operation,
    p_cost_usd:    costUsd,
    p_input_tokens:  tokens.inputTokens,
    p_output_tokens: tokens.outputTokens,
  });
}

export async function checkCostLimit(userId: string): Promise<
  | { allowed: true }
  | { allowed: false; limitUsd: number; spentUsd: number }
> {
  const supabase = createServiceClient();
  const month = currentMonth();

  const [{ data: plan }, { data: usage }] = await Promise.all([
    supabase.from("user_plans").select("monthly_cost_limit_usd").eq("user_id", userId).single(),
    supabase.from("user_usage").select("total_cost_usd").eq("user_id", userId).eq("month", month).single(),
  ]);

  const limitUsd = plan?.monthly_cost_limit_usd ?? 3.0;
  const spentUsd = usage?.total_cost_usd ?? 0;

  if (spentUsd >= limitUsd) {
    return { allowed: false, limitUsd, spentUsd };
  }
  return { allowed: true };
}

export async function getUsageSummary(userId: string) {
  const supabase = createServiceClient();
  const month = currentMonth();

  const [{ data: plan }, { data: usage }] = await Promise.all([
    supabase.from("user_plans").select("monthly_cost_limit_usd, plan_name").eq("user_id", userId).single(),
    supabase.from("user_usage").select("*").eq("user_id", userId).eq("month", month).single(),
  ]);

  return {
    month,
    plan:     plan?.plan_name ?? "free",
    limitUsd: plan?.monthly_cost_limit_usd ?? 3.0,
    spentUsd: usage?.total_cost_usd ?? 0,
    breakdown: {
      ingest: usage?.ingest_cost_usd ?? 0,
      query:  usage?.query_cost_usd  ?? 0,
      lint:   usage?.lint_cost_usd   ?? 0,
    },
    tokens: {
      input:  usage?.input_tokens  ?? 0,
      output: usage?.output_tokens ?? 0,
    },
  };
}
