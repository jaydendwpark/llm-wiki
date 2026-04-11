/**
 * Gemini 2.5 Flash wrapper.
 *
 * 1M token context window — ideal for large wiki ingestion.
 * Thinking enabled by default (auto budget) for better reasoning quality.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY environment variable is not set");
const genAI = new GoogleGenerativeAI(key);

export const MODEL_NAME = "gemini-2.5-flash";

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;  // candidatesTokenCount + thoughtsTokenCount
}

export interface LLMResponse {
  text: string;
  usage: LLMUsage;
}

export async function callLLM({
  system,
  user,
}: {
  system: string;
  user: string;
}): Promise<LLMResponse> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: system,
  });

  const result = await model.generateContent(user);
  const response = result.response;

  return {
    text: response.text(),
    usage: {
      inputTokens:  response.usageMetadata?.promptTokenCount     ?? 0,
      // candidatesTokenCount excludes thinking tokens; add thoughtsTokenCount for accurate billing
      outputTokens: (response.usageMetadata?.candidatesTokenCount ?? 0) +
                    (response.usageMetadata?.thoughtsTokenCount    ?? 0),
    },
  };
}
