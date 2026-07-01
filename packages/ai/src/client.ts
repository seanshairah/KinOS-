import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only model client. Never imported by client components — the
 * runtime guard below makes a bundling mistake fail loudly instead of
 * leaking a key.
 */

let client: Anthropic | null = null;

export function modelId(): string {
  return process.env.MODEL_ID ?? "claude-opus-4-8";
}

export function isModelConfigured(): boolean {
  return Boolean(process.env.MODEL_PROVIDER_API_KEY);
}

export function getModelClient(): Anthropic {
  if (typeof window !== "undefined") {
    throw new Error("the intelligence layer is server-only");
  }
  if (!client) {
    const apiKey = process.env.MODEL_PROVIDER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "MODEL_PROVIDER_API_KEY is not set — the intelligence layer is unavailable",
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}
