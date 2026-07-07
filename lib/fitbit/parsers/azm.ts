import { columnIndex, parseCsv } from "../csv";
import { toIsoDateSG } from "../dates";
import type { FileEntry, FitbitFolderParser, ParseResult } from "../types";

// Active Zone Minutes (AZM)/YYYY-MM.csv — minute-level rows:
// date_time,heart_zone_id,total_minutes. Daily AZM applies Fitbit's
// multipliers: fat burn ×1, cardio/peak ×2.
const ZONE_MULTIPLIER: Record<string, number> = {
  FAT_BURN: 1,
  CARDIO: 2,
  PEAK: 2,
};

export const azmParser: FitbitFolderParser = {
  folder: "Active Zone Minutes (AZM)",
  filePattern: /\.csv$/i,
  metricLabel: "AZM days",
  async parse(files: FileEntry[]): Promise<ParseResult> {
    const byDate = new Map<string, number>();
    let rowsParsed = 0;
    let rowsSkipped = 0;

    for (const file of files) {
      const { headers, rows } = parseCsv(file.content);
      const dateIdx = columnIndex(headers, "date_time", "date");
      const zoneIdx = columnIndex(headers, "heart_zone_id", "zone");
      const minutesIdx = columnIndex(headers, "total_minutes", "minutes");
      if (dateIdx === -1 || minutesIdx === -1) {
        rowsSkipped += rows.length;
        continue;
      }
      for (const row of rows) {
        const date = toIsoDateSG(row[dateIdx] ?? "");
        const minutes = Number(row[minutesIdx]);
        if (!date || !Number.isFinite(minutes) || minutes < 0) {
          rowsSkipped++;
          continue;
        }
        const zone = (zoneIdx === -1 ? "" : row[zoneIdx] ?? "").toUpperCase();
        const multiplier = ZONE_MULTIPLIER[zone] ?? 1;
        byDate.set(date, (byDate.get(date) ?? 0) + minutes * multiplier);
        rowsParsed++;
      }
    }

    return {
      partials: [...byDate.entries()].map(([date, total]) => ({
        date,
        azm_total: Math.round(total),
      })),
      rowsParsed,
      rowsSkipped,
    };
  },
};
