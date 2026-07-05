import { describe, expect, it } from "vitest";
import {
  availableCheckTypes,
  canTransitionCheck,
  composeCheckPrompt,
  describeCheckStatus,
  inQuietMode,
  quietModeLine,
  sourceFor,
  summarizeCheckResult,
  type ConnectionSnapshot,
} from "../src/requestcheck";

describe("request check capabilities", () => {
  it("with nothing connected, only the human paths are offered", () => {
    const types = availableCheckTypes([]);
    // manual covers everything; the point is it never goes to zero.
    expect(types).toContain("quick");
    expect(types).toContain("manual_checkin");
    expect(types).toContain("caregiver_confirm");
  });

  it("a phone health store adds latest-sync metrics but never a live squeeze", () => {
    const conns: ConnectionSnapshot[] = [
      { provider: "apple_health", status: "active", permissionStatus: "granted" },
    ];
    expect(availableCheckTypes(conns)).toContain("heart_rate");
    expect(sourceFor("heart_rate", conns)).toBe("apple_health");
    // Blood pressure isn't in Apple Health's declared set → falls to manual.
    expect(sourceFor("blood_pressure", conns)).toBe("manual");
  });

  it("a revoked or disconnected source stops serving checks", () => {
    const conns: ConnectionSnapshot[] = [
      { provider: "withings", status: "disconnected", permissionStatus: "granted" },
      { provider: "health_connect", status: "active", permissionStatus: "revoked" },
    ];
    expect(sourceFor("heart_rate", conns)).toBe("manual");
  });
});

describe("request check lifecycle", () => {
  it("allows the honest moves and refuses the rest", () => {
    expect(canTransitionCheck("pending", "shared")).toBe(true);
    expect(canTransitionCheck("pending", "declined")).toBe(true);
    expect(canTransitionCheck("later", "shared")).toBe(true);
    expect(canTransitionCheck("declined", "shared")).toBe(false);
    expect(canTransitionCheck("shared", "declined")).toBe(false);
    expect(canTransitionCheck("expired", "pending")).toBe(false);
  });

  it("speaks to the centre warmly and reports a no calmly", () => {
    expect(composeCheckPrompt("Tari", "quick")).toBe(
      "Tari is asking for a quick wellness check.",
    );
    expect(describeCheckStatus("declined", "Mum")).toBe(
      "Mum chose not to share this check.",
    );
    expect(describeCheckStatus("pending", "Mum")).toBe("Waiting for Mum to share.");
  });
});

describe("check result summaries", () => {
  it("inside the person's own rhythm reads as settled", () => {
    const { summary, worthACheck } = summarizeCheckResult("Mum", [
      { metric: "heart_rate", value: 66, baselineMean: 64, baselineStddev: 5 },
    ]);
    expect(worthACheck).toBe(false);
    expect(summary).toMatch(/usual rhythm/);
  });

  it("a real drift becomes 'worth a check' — never a diagnosis", () => {
    const { summary, worthACheck } = summarizeCheckResult("Mum", [
      { metric: "heart_rate", value: 96, baselineMean: 64, baselineStddev: 5 },
    ]);
    expect(worthACheck).toBe(true);
    expect(summary).toMatch(/worth a check/);
    expect(summary).not.toMatch(/abnormal|risk|diagnos/i);
  });

  it("no baseline means nothing to compare — and says so quietly", () => {
    const { worthACheck } = summarizeCheckResult("Mum", [
      { metric: "temperature", value: 37.1 },
    ]);
    expect(worthACheck).toBe(false);
  });
});

describe("quiet mode", () => {
  it("holds while the person rests and lifts after", () => {
    const now = new Date("2026-01-10T20:00:00Z");
    expect(inQuietMode("2026-01-11T06:00:00Z", now)).toBe(true);
    expect(inQuietMode("2026-01-10T19:00:00Z", now)).toBe(false);
    expect(inQuietMode(null, now)).toBe(false);
  });

  it("tells the family when requests resume, in the person's own time", () => {
    const line = quietModeLine("Mum", "2026-01-11T06:00:00Z", "Africa/Harare");
    expect(line).toMatch(/Mum is resting\. Non-urgent requests resume at 08:00\./);
  });
});
