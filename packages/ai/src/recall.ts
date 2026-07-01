import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getModelClient, isModelConfigured, modelId } from "./client";
import { embedText } from "./embeddings";
import { recallResultSchema, type RecallResult } from "./schemas";
import { passesVoice } from "./voice";

/**
 * recall — natural-language question → grounded answer over the Family
 * Record. The caller supplies the vector search (it runs under the
 * service role with an explicit permission check); this module only turns
 * matched passages into a grounded, source-linked answer.
 */

export interface RecallMatch {
  recordItemId: string;
  content: string;
  similarity: number;
}

const SYSTEM = `You answer a family member's question using only the record passages provided.
Rules:
- Ground every claim in the passages. If the record does not say, say so plainly.
- Quote dates and amounts exactly as recorded.
- Plain, warm, family language. Never diagnose, never speculate, never use technical terms.
- List the ids of the passages you used in sourceIds.`;

export async function recall(
  question: string,
  matches: RecallMatch[],
): Promise<RecallResult> {
  const empty: RecallResult = {
    answer: "The Family Record doesn't have anything on that yet.",
    sourceIds: [],
    confident: false,
  };
  if (matches.length === 0) return empty;

  if (!isModelConfigured()) {
    // Degraded mode: return the best-matching passage verbatim.
    const best = matches[0]!;
    return {
      answer: `From the Family Record: ${best.content.slice(0, 400)}`,
      sourceIds: [best.recordItemId],
      confident: false,
    };
  }

  const passages = matches
    .map((m) => `[id=${m.recordItemId}]\n${m.content.slice(0, 1200)}`)
    .join("\n\n");

  try {
    const client = getModelClient();
    const response = await client.messages.parse({
      model: modelId(),
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Question: ${question}\n\nRecord passages:\n${passages}`,
        },
      ],
      output_config: { format: zodOutputFormat(recallResultSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return empty;
    const result = recallResultSchema.parse(response.parsed_output);
    if (!passesVoice(result.answer)) return empty;
    // Only keep source ids that actually exist in the supplied matches.
    const valid = new Set(matches.map((m) => m.recordItemId));
    result.sourceIds = result.sourceIds.filter((id) => valid.has(id));
    return result;
  } catch (err) {
    console.error("recall failed", err);
    return empty;
  }
}

export { embedText };
