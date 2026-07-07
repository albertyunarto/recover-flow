import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { exerciseParser } from "../parsers/exercise";

describe("exerciseParser", () => {
  it("extracts sessions with converted units and SGT timestamps", async () => {
    const result = await exerciseParser.parse([
      {
        name: "exercise-0.json",
        content: readFileSync(
          join(__dirname, "../__fixtures__/exercise-0.json"),
          "utf-8"
        ),
      },
    ]);

    expect(result.exercises).toHaveLength(3);
    expect(result.rowsSkipped).toBe(1);

    const walk = result.exercises!.find((e) => e.source_log_id === "70001")!;
    expect(walk.activity_type).toBe("Walk");
    expect(walk.started_at).toBe("2026-07-04T08:02:11+08:00");
    expect(walk.date).toBe("2026-07-04");
    expect(walk.duration_min).toBe(24); // activeDuration wins over duration
    expect(walk.distance_km).toBeCloseTo(2.04, 2); // 1.27 mi
    expect(walk.avg_hr).toBe(104);

    const weights = result.exercises!.find((e) => e.source_log_id === "70003")!;
    expect(weights.distance_km).toBeNull();
    expect(weights.duration_min).toBe(40);
  });
});
