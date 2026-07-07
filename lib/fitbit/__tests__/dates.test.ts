import { describe, expect, it } from "vitest";
import { toIsoDateSG, toIsoDatetimeSG } from "../dates";

describe("toIsoDateSG", () => {
  it("parses Fitbit MM/DD/YY intraday timestamps", () => {
    expect(toIsoDateSG("07/04/26 09:15:23")).toBe("2026-07-04");
    expect(toIsoDateSG("12/31/25 23:59:59")).toBe("2025-12-31");
  });

  it("parses MM/DD/YYYY", () => {
    expect(toIsoDateSG("07/04/2026 09:15:23")).toBe("2026-07-04");
  });

  it("parses date-only MM/DD/YY", () => {
    expect(toIsoDateSG("01/09/26")).toBe("2026-01-09");
  });

  it("passes through plain ISO dates", () => {
    expect(toIsoDateSG("2026-07-04")).toBe("2026-07-04");
  });

  it("uses the local date for offset-less ISO datetimes (sleep files)", () => {
    expect(toIsoDateSG("2026-01-01T23:58:30.000")).toBe("2026-01-01");
  });

  it("converts UTC instants to the Singapore day", () => {
    // 2026-01-01T18:30:00Z is 2026-01-02 02:30 in SGT
    expect(toIsoDateSG("2026-01-01T18:30:00Z")).toBe("2026-01-02");
    // 2026-01-01T02:30:00Z is 2026-01-01 10:30 in SGT
    expect(toIsoDateSG("2026-01-01T02:30:00Z")).toBe("2026-01-01");
  });

  it("rejects malformed input", () => {
    expect(toIsoDateSG("")).toBeNull();
    expect(toIsoDateSG("not a date")).toBeNull();
    expect(toIsoDateSG("13/45/26 09:00:00")).toBeNull();
  });
});

describe("toIsoDatetimeSG", () => {
  it("converts MM/DD/YY HH:MM:SS to ISO with SG offset", () => {
    expect(toIsoDatetimeSG("07/04/26 09:15:23")).toBe(
      "2026-07-04T09:15:23+08:00"
    );
  });

  it("stamps SG offset on local ISO datetimes", () => {
    expect(toIsoDatetimeSG("2026-01-01T23:58:30.000")).toBe(
      "2026-01-01T23:58:30+08:00"
    );
  });

  it("re-expresses UTC instants in SG wall-clock time", () => {
    expect(toIsoDatetimeSG("2026-01-01T18:30:00Z")).toBe(
      "2026-01-02T02:30:00+08:00"
    );
  });

  it("rejects malformed input", () => {
    expect(toIsoDatetimeSG("garbage")).toBeNull();
  });
});
