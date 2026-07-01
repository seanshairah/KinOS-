import { describe, expect, it } from "vitest";
import { normalizeCapture } from "../src/normalize";

const NOW = new Date("2026-07-01T10:00:00Z");
const SUBJECT = "11111111-1111-4111-8111-111111111111";

describe("normalize", () => {
  it("accepts a valid check-in and defaults privacy to family", () => {
    const r = normalizeCapture(
      {
        subjectId: SUBJECT,
        signalType: "checkin",
        source: "manual_checkin",
        value: { mood: "okay", ate: true },
      },
      NOW,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.signal.privacyLevel).toBe("family");
      expect(r.signal.occurredAt).toBe(NOW.toISOString());
    }
  });

  it("defaults metrics to medical_private", () => {
    const r = normalizeCapture(
      {
        subjectId: SUBJECT,
        signalType: "metric",
        source: "manual_metric",
        value: { metric: "glucose", value: 5.4, unit: "mmol/L" },
      },
      NOW,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.signal.privacyLevel).toBe("medical_private");
  });

  it("rejects a malformed check-in payload", () => {
    const r = normalizeCapture(
      {
        subjectId: SUBJECT,
        signalType: "checkin",
        source: "manual_checkin",
        value: { mood: "fantastic!!" },
      },
      NOW,
    );
    expect(r.ok).toBe(false);
  });

  it("rejects signals from the future", () => {
    const r = normalizeCapture(
      {
        subjectId: SUBJECT,
        signalType: "checkin",
        source: "manual_checkin",
        value: { mood: "good" },
        occurredAt: "2026-07-02T10:00:00Z",
      },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/future/);
  });

  it("rejects an unknown signal type with a clear reason", () => {
    const r = normalizeCapture(
      { subjectId: SUBJECT, signalType: "telepathy", source: "manual_checkin" },
      NOW,
    );
    expect(r.ok).toBe(false);
  });

  it("honours an explicit privacy override", () => {
    const r = normalizeCapture(
      {
        subjectId: SUBJECT,
        signalType: "checkin",
        source: "manual_checkin",
        value: { mood: "low" },
        privacyLevel: "medical_private",
      },
      NOW,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.signal.privacyLevel).toBe("medical_private");
  });
});
