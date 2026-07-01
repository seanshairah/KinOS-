import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getModelClient, modelId } from "./client";
import { extractResultSchema, type ExtractResult } from "./schemas";

/**
 * extract — voice note / receipt / document text → structured signals.
 *
 * Contract: strict JSON via schema-constrained output; low confidence is
 * preserved (the engine phrases it as "worth a check"); on refusal or
 * validation failure we return null and the pipeline records a dead letter
 * rather than inventing data.
 */

const SYSTEM = `You extract care signals from family notes for a private family coordination record.
The notes may be transcribed voice messages from caregivers, receipt text, or document snippets, possibly in informal or mixed language.

Rules:
- Extract only what the text actually supports. Omit rather than guess.
- Confidence reflects how directly the text states the fact.
- Labels are lowercase snake_case. Symptoms use the form "symptom:<name>".
- Money amounts keep their currency in "unit".
- followUps are practical family tasks (e.g. "Confirm transport for the clinic visit"), never medical advice.
- The summary is one calm sentence a family member would find reassuring and clear.
- Never diagnose, never use clinical or technical jargon.`;

export type SourceKind = "voice_note" | "receipt" | "document";

export async function extract(
  text: string,
  kind: SourceKind,
): Promise<ExtractResult | null> {
  const client = getModelClient();
  const prompt = `Source type: ${kind}\n\nText:\n"""\n${text.slice(0, 8000)}\n"""`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.parse({
        model: modelId(),
        max_tokens: 2048,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(extractResultSchema), effort: "low" },
      });
      if (response.stop_reason === "refusal") return null;
      if (response.parsed_output) {
        return extractResultSchema.parse(response.parsed_output);
      }
    } catch (err) {
      if (attempt === 1) {
        console.error("extract failed", err);
        return null;
      }
    }
  }
  return null;
}
