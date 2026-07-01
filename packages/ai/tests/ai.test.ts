import { describe, expect, it } from "vitest";
import { EMBEDDING_DIM, LocalHashEmbedding } from "../src/embeddings";
import { passesVoice, violatesVoice } from "../src/voice";

describe("voice guard", () => {
  it("passes calm family language", () => {
    expect(
      passesVoice(
        "Mum is okay today. Attention needed: transport is not confirmed for tomorrow's clinic visit.",
      ),
    ).toBe(true);
  });

  it("rejects machine and provider vocabulary", () => {
    for (const bad of [
      "Risk detected by AI model.",
      "Our machine learning system flagged this.",
      "Anomaly: sleep metric deviation -34%.",
      "The model suggests a diagnosis.",
      "Non-compliance event logged for subject.",
    ]) {
      expect(passesVoice(bad)).toBe(false);
    }
  });

  it("does not false-positive on ordinary words", () => {
    expect(violatesVoice("The email said the detail was fine. Maintain the rhythm.")).toBeNull();
  });
});

describe("local embeddings", () => {
  const provider = new LocalHashEmbedding();

  it("produces normalized vectors of the right dimension", async () => {
    const v = await provider.embed("dad mentioned leg pain after the walk");
    expect(v).toHaveLength(EMBEDDING_DIM);
    const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("is deterministic", async () => {
    const a = await provider.embed("pharmacy receipt 23.50");
    const b = await provider.embed("pharmacy receipt 23.50");
    expect(a).toEqual(b);
  });

  it("ranks related text above unrelated text", async () => {
    const query = await provider.embed("when did dad first mention leg pain");
    const related = await provider.embed("dad mentioned leg pain after the morning walk");
    const unrelated = await provider.embed("school fees were paid on time this term");
    const dot = (x: number[], y: number[]) => x.reduce((a, v, i) => a + v * y[i]!, 0);
    expect(dot(query, related)).toBeGreaterThan(dot(query, unrelated));
  });
});
