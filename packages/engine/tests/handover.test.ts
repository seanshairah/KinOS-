import { describe, expect, it } from "vitest";
import { composeHandover, type HandoverFacts } from "../src/handover";

const base: HandoverFacts = {
  subjectName: "Mum",
  fromName: "Grace",
  toName: "Tari",
  today: [],
  openDuties: [],
  medication: { dosesTaken: 0, dosesOpen: 0 },
  expensesToday: [],
  upcoming: [],
  worthWatching: [],
};

describe("family handover", () => {
  it("carries the day, the open ends, and what deserves an eye", () => {
    const body = composeHandover({
      ...base,
      today: ["Checked in at 08:10, feeling okay", "Light lunch"],
      openDuties: [{ title: "Evening dose", ownerName: "Tari" }],
      medication: { dosesTaken: 1, dosesOpen: 1 },
      expensesToday: [{ note: "USD 12.00 pharmacy" }],
      upcoming: [{ title: "Clinic review", when: "Tue 10:00" }],
      worthWatching: ["Mentioned dizziness once"],
    });
    expect(body).toMatch(/^Handover from Grace to Tari — Mum\./);
    expect(body).toMatch(/Checked in at 08:10/);
    expect(body).toMatch(/1 taken, 1 still open/);
    expect(body).toMatch(/Evening dose \(Tari\)/);
    expect(body).toMatch(/USD 12\.00 pharmacy/);
    expect(body).toMatch(/Clinic review · Tue 10:00/);
    expect(body).toMatch(/Worth an eye: Mentioned dizziness once\./);
  });

  it("a quiet day still hands over honestly", () => {
    const body = composeHandover(base);
    expect(body).toMatch(/Today was quiet/);
    expect(body).not.toMatch(/Worth an eye/);
  });
});
