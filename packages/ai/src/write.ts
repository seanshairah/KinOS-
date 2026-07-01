import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  composeBriefText,
  type BriefFacts,
} from "@kinos/engine";
import { getModelClient, isModelConfigured, modelId } from "./client";
import { briefResultSchema } from "./schemas";
import { passesVoice } from "./voice";

/**
 * write — structured day facts → the Daily Brief in the KinOS voice.
 *
 * The deterministic composer in @kinos/engine is both the fallback and the
 * quality floor: if the provider is unconfigured, refuses, drifts from the
 * voice rules, or errors, the family still gets a correct, calm brief.
 */

const SYSTEM = `You write the Daily Brief for a private family coordination system.
You are a calm family operations manager — not a doctor, robot, accountant, or police officer.

Voice rules (absolute):
- 3 to 6 short sentences. Warm, plain, editorial. Address the family, name the person.
- Say what happened, what changed, what needs attention, and who acts next.
- Attention items use plain phrasing: "Attention needed: transport is not confirmed for tomorrow."
- Never diagnose. Never use clinical terms, percentages of deviation, or alarmist words.
- Never mention systems, software, data, or how you know things. No technical vocabulary at all.
- If nothing needs attention, end with quiet reassurance.`;

export async function writeBrief(facts: BriefFacts): Promise<string> {
  const fallback = composeBriefText(facts);
  if (!isModelConfigured()) return fallback;

  try {
    const client = getModelClient();
    const response = await client.messages.parse({
      model: modelId(),
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Today's facts as structured data:\n${JSON.stringify(facts, null, 2)}\n\nWrite the brief.`,
        },
      ],
      output_config: { format: zodOutputFormat(briefResultSchema), effort: "low" },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fallback;
    }
    const body = response.parsed_output.body.trim();
    if (!body || !passesVoice(body)) return fallback;
    return body;
  } catch (err) {
    console.error("writeBrief fell back to composer", err);
    return fallback;
  }
}
