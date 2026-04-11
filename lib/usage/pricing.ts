/**
 * Token pricing constants (USD per token).
 * Source: https://ai.google.dev/gemini-api/docs/pricing (2026-04)
 */

export const PRICING = {
  // gemini-2.5-flash — output price includes thinking tokens
  geminiFlash: {
    input:  0.30 / 1_000_000,   // $0.30 / 1M input tokens
    output: 2.50 / 1_000_000,   // $2.50 / 1M output tokens
  },
} as const;

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
}

export function calculateCostUsd(tokens: TokenCounts): number {
  return (
    tokens.inputTokens  * PRICING.geminiFlash.input +
    tokens.outputTokens * PRICING.geminiFlash.output
  );
}
