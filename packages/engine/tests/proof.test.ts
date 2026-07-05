import { describe, expect, it } from "vitest";
import { composeProofOfCare, type ProofOfCareFacts } from "../src/proof";

const base: ProofOfCareFacts = {
  workspaceName: "Moyo family",
  weekLabel: "Week of 29 June",
  visitsLogged: 0,
  dosesTaken: 0,
  dosesMissed: 0,
  receiptsUploaded: 0,
  appointmentsAttended: 0,
  dutiesCompleted: 0,
  attentionResolved: 0,
  attentionStillOpen: [],
  checkinsReceived: 0,
};

describe("proof of care", () => {
  it("a full week reads as an account, and closes clean", () => {
    const { body, stats } = composeProofOfCare({
      ...base,
      visitsLogged: 3,
      dosesTaken: 12,
      receiptsUploaded: 2,
      appointmentsAttended: 1,
      dutiesCompleted: 4,
      attentionResolved: 2,
      checkinsReceived: 6,
    });
    expect(body).toMatch(/6 check-ins arrived/);
    expect(body).toMatch(/3 caregiver visits were logged/);
    expect(body).toMatch(/2 receipts kept in the record/);
    expect(body).toMatch(/The week closed clean\./);
    expect(stats.visits).toBe(3);
    expect(stats.attentionOpen).toBe(0);
  });

  it("what stayed open is named, not hidden", () => {
    const { body, stats } = composeProofOfCare({
      ...base,
      dosesTaken: 10,
      dosesMissed: 2,
      attentionStillOpen: [{ title: "Refill due", subjectName: "Mum" }],
    });
    expect(body).toMatch(/2 doses were marked missed/);
    expect(body).toMatch(/Still open going into next week:/);
    expect(body).toMatch(/· Refill due \(Mum\)/);
    expect(stats.attentionOpen).toBe(1);
  });

  it("a quiet week is said plainly", () => {
    const { body } = composeProofOfCare(base);
    expect(body).toMatch(/A quiet week/);
  });
});
