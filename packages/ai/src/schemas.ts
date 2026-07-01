import { z } from "zod";

/**
 * Strict output contracts. The model proposes; these schemas decide what
 * is even representable. Anything that fails validation is rejected and
 * retried once, then dropped — never guessed at.
 */

export const extractedSignalSchema = z.object({
  type: z.enum([
    "medication_dose",
    "meal",
    "symptom",
    "mood",
    "expense",
    "appointment",
    "sleep",
    "activity",
    "care_task",
    "other",
  ]),
  label: z
    .string()
    .describe(
      "Short lowercase snake_case label, e.g. 'appetite_low' or 'symptom:dizziness'",
    ),
  value: z.string().nullable().describe("The observed value, if any"),
  unit: z.string().nullable().describe("Unit for the value, if any"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How certain the note supports this. Below 0.6 = worth a check."),
});

export const extractResultSchema = z.object({
  signals: z.array(extractedSignalSchema).max(12),
  followUps: z
    .array(
      z.object({
        title: z.string().describe("A duty phrased as a plain family task"),
        reason: z.string(),
      }),
    )
    .max(3)
    .describe("Concrete follow-up duties the note implies, if any"),
  summary: z
    .string()
    .describe("One calm sentence for the record, plain family language"),
});
export type ExtractResult = z.infer<typeof extractResultSchema>;

export const briefResultSchema = z.object({
  body: z
    .string()
    .describe("The brief text: 3-6 warm, plain sentences in the family voice"),
});
export type BriefResult = z.infer<typeof briefResultSchema>;

export const recallResultSchema = z.object({
  answer: z
    .string()
    .describe("Grounded answer in plain words, or a statement that the record does not say"),
  sourceIds: z
    .array(z.string())
    .describe("record_item ids the answer is grounded in"),
  confident: z.boolean(),
});
export type RecallResult = z.infer<typeof recallResultSchema>;
