import { describe, expect, it } from "vitest";
import { composeFamilyRhythm, type RhythmInputs } from "../src/rhythm";

const base: RhythmInputs = {
  subjectName: "Mum",
  timezone: "Africa/Harare",
  checkinHours: [],
  dosesTaken: 0,
  dosesScheduled: 0,
  visitWeekdays: [],
  weeklySpendCounts: [],
};

describe("family rhythm", () => {
  it("says nothing when there is no rhythm to describe", () => {
    expect(composeFamilyRhythm(base)).toEqual([]);
  });

  it("a steady check-in hour reads as steady", () => {
    const lines = composeFamilyRhythm({
      ...base,
      checkinHours: [8, 8, 9, 8, 8, 9, 8],
    });
    const checkin = lines.find((l) => l.topic === "checkin")!;
    expect(checkin.state).toBe("steady");
    expect(checkin.text).toMatch(/usually checks in around 08:00/);
  });

  it("a drifting check-in hour is a shift, never a finding", () => {
    const lines = composeFamilyRhythm({
      ...base,
      checkinHours: [8, 8, 8, 8, 12, 13, 12],
    });
    const checkin = lines.find((l) => l.topic === "checkin")!;
    expect(checkin.state).toBe("shifting");
    expect(checkin.text).toMatch(/shift in rhythm/);
    expect(checkin.text).not.toMatch(/abnormal|concern|risk/i);
  });

  it("medication rhythm turns gentle when doses slip", () => {
    const steady = composeFamilyRhythm({ ...base, dosesTaken: 13, dosesScheduled: 14 });
    expect(steady.find((l) => l.topic === "medication")!.state).toBe("steady");
    const slipping = composeFamilyRhythm({ ...base, dosesTaken: 8, dosesScheduled: 14 });
    const line = slipping.find((l) => l.topic === "medication")!;
    expect(line.state).toBe("shifting");
    expect(line.text).toMatch(/gentle look/);
  });

  it("visits and spending cadence are described plainly", () => {
    const lines = composeFamilyRhythm({
      ...base,
      visitWeekdays: ["Tue", "Fri", "Tue"],
      weeklySpendCounts: [2, 2, 6],
    });
    expect(lines.find((l) => l.topic === "visits")!.text).toMatch(/Tue and Fri/);
    expect(lines.find((l) => l.topic === "money")!.state).toBe("shifting");
  });
});
