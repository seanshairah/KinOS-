import { describe, expect, it } from "vitest";
import { composeTomorrowPrep, type TomorrowFacts } from "../src/prep";

const base: TomorrowFacts = {
  subjectName: "Mum",
  appointments: [],
  refillsDue: [],
  dutiesDue: [],
  caregiverVisitExpected: false,
  caregiverVisitPlanned: false,
  documentsToCarry: [],
};

describe("tomorrow prep", () => {
  it("an empty tomorrow is clear, not silent", () => {
    const prep = composeTomorrowPrep(base);
    expect(prep.ready).toBe(true);
    expect(prep.headline).toBe("Tomorrow is clear for Mum. Nothing to prepare.");
  });

  it("a full, settled tomorrow is ready", () => {
    const prep = composeTomorrowPrep({
      ...base,
      appointments: [
        {
          title: "Clinic review",
          when: "10:00",
          transportConfirmed: true,
          transportOwnerName: "Tari",
        },
      ],
      dutiesDue: [{ title: "Collect groceries", ownerName: "Grace" }],
    });
    expect(prep.ready).toBe(true);
    expect(prep.headline).toBe("Tomorrow is ready for Mum.");
    expect(prep.plan.length).toBe(2);
  });

  it("one gap reads as 'ready except one thing'", () => {
    const prep = composeTomorrowPrep({
      ...base,
      appointments: [{ title: "Clinic review", when: "10:00", transportConfirmed: false }],
    });
    expect(prep.ready).toBe(false);
    expect(prep.headline).toBe("Tomorrow is ready except one thing.");
    expect(prep.gaps[0]).toMatch(/Transport for clinic review isn't confirmed/);
  });

  it("counts every gap: transport, refill, ownerless duty, missing visit", () => {
    const prep = composeTomorrowPrep({
      ...base,
      appointments: [{ title: "Clinic review", when: "10:00", transportConfirmed: false }],
      refillsDue: [{ medicationName: "Amlodipine" }],
      dutiesDue: [{ title: "Fix the gate" }],
      caregiverVisitExpected: true,
      caregiverVisitPlanned: false,
    });
    expect(prep.ready).toBe(false);
    expect(prep.gaps).toHaveLength(4);
    expect(prep.headline).toBe("Tomorrow needs 4 things settled.");
  });
});
