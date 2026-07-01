import { describe, expect, it } from "vitest";
import { decideEscalation, inQuietHours } from "../src/escalation";
import { detectPattern } from "../src/patterns";

describe("escalation ladder", () => {
  const createdAt = new Date("2026-07-01T08:00:00Z");

  it("notifies the owner first", () => {
    const d = decideEscalation({
      severity: "attention",
      createdAt,
      now: new Date("2026-07-01T08:05:00Z"),
    });
    expect(d.target).toBe("owner");
    expect(d.notifyNow).toBe(true);
  });

  it("escalates to admins after six unresolved hours", () => {
    const d = decideEscalation({
      severity: "attention",
      createdAt,
      now: new Date("2026-07-01T14:30:00Z"),
    });
    expect(d.target).toBe("admins");
  });

  it("reaches emergency contacts after a day", () => {
    const d = decideEscalation({
      severity: "attention",
      createdAt,
      now: new Date("2026-07-02T09:00:00Z"),
    });
    expect(d.target).toBe("emergency_contacts");
  });

  it("holds non-urgent notices during quiet hours", () => {
    const d = decideEscalation({
      severity: "attention",
      createdAt: new Date("2026-07-01T22:00:00Z"),
      now: new Date("2026-07-01T22:30:00Z"),
      quietHours: { start: "21:00", end: "07:00", timezone: "UTC" },
    });
    expect(d.notifyNow).toBe(false);
    expect(d.reason).toContain("quiet hours");
  });

  it("urgent never waits for morning", () => {
    const d = decideEscalation({
      severity: "urgent",
      createdAt: new Date("2026-07-01T22:00:00Z"),
      now: new Date("2026-07-01T22:30:00Z"),
      quietHours: { start: "21:00", end: "07:00", timezone: "UTC" },
    });
    expect(d.notifyNow).toBe(true);
  });

  it("handles quiet hours crossing midnight", () => {
    const quiet = { start: "21:00", end: "07:00", timezone: "UTC" };
    expect(inQuietHours(new Date("2026-07-01T23:00:00Z"), quiet)).toBe(true);
    expect(inQuietHours(new Date("2026-07-01T03:00:00Z"), quiet)).toBe(true);
    expect(inQuietHours(new Date("2026-07-01T12:00:00Z"), quiet)).toBe(false);
  });
});

describe("patterns", () => {
  it("describes a shorter-sleep trend in plain words", () => {
    const history = Array.from({ length: 14 }, () => 420 + (Math.sin(1) * 5));
    const recent = Array.from({ length: 7 }, () => 350);
    const p = detectPattern("sleep_minutes", [...history, ...recent], "Mum");
    // Zero-variance history is unreliable by design; add mild variance.
    const varied = history.map((v, i) => v + (i % 3) * 6);
    const p2 = detectPattern("sleep_minutes", [...varied, ...recent], "Mum");
    expect(p2).not.toBeNull();
    expect(p2!.direction).toBe("down");
    expect(p2!.summary).toContain("shorter");
    expect(p2!.summary).toContain("Worth a check");
    expect(p ?? p2).toBeTruthy();
  });

  it("returns null with insufficient history — no guessing", () => {
    expect(detectPattern("steps", [100, 120, 130], "Mum")).toBeNull();
  });

  it("reports steady when the recent window matches the baseline", () => {
    const values = [420, 428, 415, 431, 419, 425, 422, 424, 427, 418, 423, 429, 421, 426, 424, 422, 425, 423, 420, 427];
    const p = detectPattern("sleep_minutes", values, "Mum");
    expect(p).not.toBeNull();
    expect(p!.direction).toBe("steady");
  });
});
