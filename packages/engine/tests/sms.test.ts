import { describe, expect, it } from "vitest";
import { parseSmsCheckinReply } from "../src/sms";

describe("parseSmsCheckinReply", () => {
  it("reads the canonical digits", () => {
    expect(parseSmsCheckinReply("1")).toEqual({ mood: "good" });
    expect(parseSmsCheckinReply("2")).toEqual({ mood: "okay" });
    expect(parseSmsCheckinReply("3")).toEqual({ mood: "unwell" });
  });

  it("tolerates punctuation and trailing words around a digit", () => {
    expect(parseSmsCheckinReply(" 1. ")).toEqual({ mood: "good" });
    expect(parseSmsCheckinReply("2 thanks dear")).toEqual({ mood: "okay" });
    expect(parseSmsCheckinReply("3!!")).toEqual({ mood: "unwell" });
  });

  it("understands plain English words", () => {
    expect(parseSmsCheckinReply("Good")).toEqual({ mood: "good" });
    expect(parseSmsCheckinReply("doing well today")).toEqual({ mood: "good" });
    expect(parseSmsCheckinReply("im okay")).toEqual({ mood: "okay" });
    expect(parseSmsCheckinReply("feeling sick")).toEqual({ mood: "unwell" });
    expect(parseSmsCheckinReply("a bit tired")).toEqual({ mood: "unwell" });
  });

  it("never lets negation flip the meaning", () => {
    expect(parseSmsCheckinReply("not great")).toEqual({ mood: "unwell" });
    expect(parseSmsCheckinReply("Not feeling well")).toEqual({ mood: "unwell" });
    expect(parseSmsCheckinReply("not bad at all")).toEqual({ mood: "okay" });
    expect(parseSmsCheckinReply("not ok")).toEqual({ mood: "unwell" });
  });

  it("speaks Shona and Ndebele", () => {
    expect(parseSmsCheckinReply("Ndiripo")).toEqual({ mood: "good" });
    expect(parseSmsCheckinReply("zvakanaka hako")).toEqual({ mood: "good" });
    expect(parseSmsCheckinReply("ndinorwara")).toEqual({ mood: "unwell" });
    expect(parseSmsCheckinReply("Ngikhona")).toEqual({ mood: "good" });
    expect(parseSmsCheckinReply("kulungile")).toEqual({ mood: "okay" });
    expect(parseSmsCheckinReply("ngiyagula")).toEqual({ mood: "unwell" });
  });

  it("returns null rather than guessing", () => {
    expect(parseSmsCheckinReply("")).toBeNull();
    expect(parseSmsCheckinReply("???")).toBeNull();
    expect(parseSmsCheckinReply("call me later")).toBeNull();
    expect(parseSmsCheckinReply("4")).toBeNull();
    expect(parseSmsCheckinReply("STOP")).toBeNull();
  });
});
